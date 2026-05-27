import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { OutboxEvent, Prisma } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';
import type { NotificationJobPayload } from '@/modules/queue/dto/notification-job.dto';

export interface OutboxEventData {
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
}

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 50;

// Retry with exponential backoff + ±20 % jitter to prevent retry storms when
// multiple workers are polling simultaneously.
function retryDelayMs(attempt: number): number {
  const base = 1000 * Math.pow(2, attempt);
  const jitter = base * 0.2 * (Math.random() * 2 - 1);
  return Math.round(base + jitter);
}

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue<NotificationJobPayload>,
  ) {}

  // Called inside a Prisma transaction so the event is persisted atomically
  // with the business state change (order creation). If the app crashes before
  // the processor runs, the event is still in the DB and will be picked up.
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

      await this.enqueueNotification(event);

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

  private async enqueueNotification(event: OutboxEvent): Promise<void> {
    if (event.eventType !== 'ORDER_CREATED') return;

    const payload = event.payload as unknown as NotificationJobPayload;
    const attempt = event.attempts + 1;

    await this.notificationsQueue.add(payload.type, payload, {
      attempts: 5,
      // BullMQ exponential backoff; jitter is applied at the outbox level on re-poll
      backoff: { type: 'exponential', delay: retryDelayMs(attempt) },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
