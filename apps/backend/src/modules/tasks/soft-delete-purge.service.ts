import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { DistributedLockService } from '@/common/services/distributed-lock.service';

const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1_000; // once per day
const LOCK_TTL_MS = 5 * 60 * 1_000; // 5 minutes
const GRACE_PERIOD_DAYS = 90;

@Injectable()
export class SoftDeletePurgeService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(SoftDeletePurgeService.name);
  private intervalId?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly lock: DistributedLockService,
  ) {}

  onApplicationBootstrap(): void {
    this.intervalId = setInterval(() => void this.tick(), PURGE_INTERVAL_MS);
    this.logger.log(`Soft-delete purge job scheduled (interval=${PURGE_INTERVAL_MS}ms)`);
  }

  onApplicationShutdown(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private async tick(): Promise<void> {
    await this.lock.withLock('soft-delete:purge', LOCK_TTL_MS, () => this.runPurge());
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
