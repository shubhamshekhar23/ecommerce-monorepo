import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { LeaderElectionService } from '@/common/services/leader-election.service';

const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1_000; // once per day
const GRACE_PERIOD_DAYS = 90;

/*
 - Uses LeaderElectionService as the coordination primitive instead of per-tick
 - DistributedLock: if this replica is not the current leader it skips the tick
 - entirely, avoiding even the cost of a lock attempt. The distributed lock was
 - appropriate for the outbox (short-lived, any replica can run it); leader
 - election is appropriate here because the purge is infrequent, expensive,
 - and meaningless to run in parallel across replicas.
 */
@Injectable()
export class SoftDeletePurgeService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(SoftDeletePurgeService.name);
  private intervalId?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly leader: LeaderElectionService,
  ) {}

  onApplicationBootstrap(): void {
    this.intervalId = setInterval(() => void this.tick(), PURGE_INTERVAL_MS);
    this.logger.log(`Soft-delete purge job scheduled (interval=${PURGE_INTERVAL_MS}ms)`);
  }

  onApplicationShutdown(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private async tick(): Promise<void> {
    if (!this.leader.isCurrentLeader) {
      this.logger.debug('Skipping purge tick — not the leader');
      return;
    }
    await this.runPurge();
  }

  private async runPurge(): Promise<void> {
    const cutoff = new Date(Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1_000);
    const [products, categories, users] = await Promise.all([
      this.prisma.$executeRaw`DELETE FROM "Product" WHERE "deletedAt" < ${cutoff}`,
      this.prisma.$executeRaw`DELETE FROM "Category" WHERE "deletedAt" < ${cutoff}`,
      this.prisma.$executeRaw`DELETE FROM "User" WHERE "deletedAt" < ${cutoff}`,
    ]);
    this.logger.log(
      `Purge complete: products=${products}, categories=${categories}, users=${users}`,
    );
  }
}
