import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { OutboxService } from './outbox.service';

const POLL_INTERVAL_MS = 5_000;

// Why polling instead of database LISTEN/NOTIFY?
// LISTEN/NOTIFY is session-scoped and incompatible with PgBouncer transaction
// pooling mode (the same reason Prisma migrations must use directUrl).
// A 5-second poll with a small batch size is a well-understood pattern that
// works in any deployment topology. Move to LISTEN/NOTIFY after Phase 0
// infrastructure graduates to a connection-mode pooler (pgpool-II).
@Injectable()
export class OutboxProcessor implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxProcessor.name);
  private intervalId?: ReturnType<typeof setInterval>;

  constructor(private readonly outboxService: OutboxService) {}

  onApplicationBootstrap(): void {
    this.intervalId = setInterval(() => {
      void this.tick();
    }, POLL_INTERVAL_MS);

    this.logger.log(`Outbox processor started (interval=${POLL_INTERVAL_MS}ms)`);
  }

  onApplicationShutdown(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.logger.log('Outbox processor stopped');
    }
  }

  private async tick(): Promise<void> {
    try {
      await this.outboxService.processPendingBatch();
    } catch (error) {
      this.logger.error(
        `Outbox poll failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
