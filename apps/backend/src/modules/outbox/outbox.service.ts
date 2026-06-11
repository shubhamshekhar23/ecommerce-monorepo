import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Prisma } from '@prisma/client';
import type { OutboxEvent } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { EXCHANGES, ROUTING_KEYS } from '@ecommerce/shared-types';
import type { OrderPlacedEvent } from '@ecommerce/shared-types';
import { isBugScenario } from '@/modules/debug-scenarios/bug-scenario.guard';

export interface OutboxEventData {
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
}

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 50;

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly amqp: AmqpConnection,
  ) {}

  // Called inside a Prisma transaction so the event is persisted atomically
  // with the business state change. If the app crashes before the processor
  // runs, the event is still in the DB and will be picked up on next poll.
  async publish(tx: Prisma.TransactionClient, data: OutboxEventData): Promise<void> {
    await tx.outboxEvent.create({ data });
  }

  async processPendingBatch(): Promise<void> {
    const events = await this.claimPendingEvents();
    if (events.length === 0) return;

    this.logger.log(`Processing ${events.length} outbox event(s)`);
    for (const event of events) {
      await this.dispatchEvent(event);
    }
  }

  // Atomically claims up to BATCH_SIZE PENDING events.
  // FOR UPDATE SKIP LOCKED ensures concurrent replicas never claim the same row:
  // each replica locks the rows it selects and skips rows already locked by others.
  // The lock is released the moment the transaction commits (after the status update).
  private async claimPendingEvents(): Promise<OutboxEvent[]> {
    return this.prisma.$transaction(async (tx) => {
      const pending = await tx.$queryRaw<OutboxEvent[]>(
        Prisma.sql`
          SELECT * FROM "OutboxEvent"
          WHERE status = 'PENDING'::"OutboxEventStatus"
          AND attempts < ${MAX_ATTEMPTS}
          ORDER BY "createdAt" ASC
          LIMIT ${BATCH_SIZE}
          FOR UPDATE SKIP LOCKED
        `,
      );

      if (pending.length === 0) return [];

      await tx.outboxEvent.updateMany({
        where: { id: { in: pending.map((e) => e.id) } },
        data: { status: 'PROCESSING', attempts: { increment: 1 } },
      });

      return pending;
    });
  }

  private async dispatchEvent(event: OutboxEvent): Promise<void> {
    try {
      // Status set to PROCESSING and attempts incremented atomically in claimPendingEvents.
      await this.publishToRabbitMQ(event);

      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });
    } catch (error) {
      await this.handleDispatchError(event, error);
    }
  }

  private async handleDispatchError(event: OutboxEvent, error: unknown): Promise<void> {
    const attempts = event.attempts + 1;
    const failed = attempts >= MAX_ATTEMPTS;

    await this.prisma.outboxEvent.update({
      where: { id: event.id },
      data: {
        status: failed ? 'FAILED' : 'PENDING',
        attempts,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    if (failed) {
      this.logger.error(`Outbox event permanently failed: id=${event.id} type=${event.eventType}`);
    } else {
      this.logger.warn(
        `Outbox dispatch failed (attempt ${attempts}/${MAX_ATTEMPTS}): id=${event.id}`,
      );
    }
  }

  private async publishToRabbitMQ(event: OutboxEvent): Promise<void> {
    /*
     - S21: event silently dropped — order returns 201, no errors, but emails/stock alerts never fire.
     - Signal: Jaeger order span completes OK but outbox processor span has no RabbitMQ child span.
     - Loki: "order created" log exists but no "Published order.placed" log downstream.
     - RabbitMQ UI: queue message count stays 0; Mailpit: no emails received.
    */
    if (isBugScenario(21)) {
      this.logger.log(`[S21] Silently dropping outbox event: type=${event.eventType} id=${event.id}`);
      return;
    }

    if (event.eventType === 'ORDER_CREATED') {
      const payload = event.payload as unknown as OrderPlacedEvent;
      await this.amqp.publish(EXCHANGES.ORDER, ROUTING_KEYS.ORDER.PLACED, payload);
      this.logger.log(`Published order.placed to RabbitMQ: orderId=${payload.orderId}`);
      return;
    }

    // USER_REGISTERED publishing is wired in Step 3 (auth service extraction).
    // Until then, welcome emails are still sent directly by auth.service.ts.
    this.logger.warn(`No RabbitMQ route for event type: ${event.eventType}`);
  }
}
