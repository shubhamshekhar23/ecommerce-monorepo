import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import type { OutboxEvent, Prisma } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { EXCHANGES, ROUTING_KEYS } from '@ecommerce/shared-types';
import type { OrderPlacedEvent } from '@ecommerce/shared-types';

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
    const events = await this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING', attempts: { lt: MAX_ATTEMPTS } },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    });

    if (events.length === 0) return;

    this.logger.log(`Processing ${events.length} outbox event(s)`);
    for (const event of events) {
      await this.dispatchEvent(event);
    }
  }

  private async dispatchEvent(event: OutboxEvent): Promise<void> {
    try {
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: 'PROCESSING', attempts: { increment: 1 } },
      });

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
