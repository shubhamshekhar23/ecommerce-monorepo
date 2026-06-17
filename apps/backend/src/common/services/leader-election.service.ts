import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as os from 'os';
import { RedisService } from '@/modules/cache/redis.service';

/*
 - Leader Election vs Distributed Lock:
 -   DistributedLockService: short-lived exclusive access (ms–seconds). Lock is released after each op.
 -   LeaderElectionService: one replica holds a long-lived lease and is the designated executor for all
 -   recurring work. Others stand by and take over if the leader crashes. TTL = 30 s, renewed every 10 s.
 -
 - If the leader pod crashes, the lease expires in ≤ 30 s and the first follower to renew becomes leader.
 - POD_NAME injected via Kubernetes fieldRef: metadata.name so each pod has a stable identity.
 */

const LEASE_KEY = 'leader:backend';
const LEASE_TTL_MS = 30_000;
const RENEW_INTERVAL_MS = 10_000;

/*
 - Atomic check-or-set: if key is unset, set it; if it's ours, extend the TTL; else return 0.
 - Must be atomic — a non-atomic GET then SET has a race window where two replicas could both
 - see the key as absent and both write, breaking the single-leader guarantee.
 */
const ACQUIRE_OR_RENEW_SCRIPT = `
  local v = redis.call('GET', KEYS[1])
  if v == false then
    return redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])
  elseif v == ARGV[1] then
    return redis.call('PEXPIRE', KEYS[1], ARGV[2])
  else
    return 0
  end
`;

const RELEASE_SCRIPT = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  else
    return 0
  end
`;

@Injectable()
export class LeaderElectionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LeaderElectionService.name);
  private readonly instanceId = process.env.POD_NAME ?? os.hostname();
  private isLeader = false;
  private renewIntervalId?: ReturnType<typeof setInterval>;

  constructor(private readonly redis: RedisService) {}

  async onModuleInit(): Promise<void> {
    await this.tryAcquire();
    this.renewIntervalId = setInterval(() => void this.tryAcquire(), RENEW_INTERVAL_MS);
    this.logger.log(`Leader election started (instanceId=${this.instanceId})`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.renewIntervalId) clearInterval(this.renewIntervalId);
    if (this.isLeader) await this.release();
  }

  get isCurrentLeader(): boolean {
    return this.isLeader;
  }

  private async tryAcquire(): Promise<void> {
    try {
      const result = await this.redis
        .getClient()
        .eval(ACQUIRE_OR_RENEW_SCRIPT, 1, LEASE_KEY, this.instanceId, String(LEASE_TTL_MS));
      const wasLeader = this.isLeader;
      this.isLeader = result !== 0;
      if (this.isLeader && !wasLeader) {
        this.logger.log(`Became leader (instanceId=${this.instanceId})`);
      } else if (!this.isLeader && wasLeader) {
        this.logger.warn(`Lost leadership (instanceId=${this.instanceId})`);
      }
    } catch (err) {
      this.logger.error(`Leader election check failed: ${String(err)}`);
      this.isLeader = false;
    }
  }

  private async release(): Promise<void> {
    try {
      await this.redis.getClient().eval(RELEASE_SCRIPT, 1, LEASE_KEY, this.instanceId);
      this.logger.log(`Released leadership (instanceId=${this.instanceId})`);
    } catch (err) {
      this.logger.warn(`Leadership release failed: ${String(err)}`);
    }
  }
}
