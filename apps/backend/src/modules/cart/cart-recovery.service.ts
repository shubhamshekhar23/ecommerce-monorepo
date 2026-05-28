import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';

// Delayed jobs — the BullMQ pattern for time-triggered workflows.
//
// How it works in Redis:
//   queue.add('send', payload, { delay: 3_600_000 })
//   → ZADD bull:cart-recovery:delayed <executeAt_timestamp> <jobId>
//
//   BullMQ's scheduler polls the sorted set every second:
//   → ZRANGEBYSCORE 0 <now> → promotes ready jobs to the active list
//
// The key insight: delay is stored as a Redis Sorted Set score (execute_at timestamp).
// Moving a job forward in time = ZADD with new score. Cancelling = ZREM.
//
// Abandoned cart flow:
//   1. User adds to cart → schedule a check in 1 hour
//   2. If user checks out → cancel the delayed job (ZREM)
//   3. If job fires after 1h → if cart is still non-empty → enqueue a recovery email

const ABANDON_DELAY_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class CartRecoveryService {
  constructor(
    @InjectQueue(QUEUE_NAMES.CART_RECOVERY) private readonly recoveryQueue: Queue,
  ) {}

  async scheduleCheck(userId: string, cartId: string): Promise<void> {
    // Use userId as the jobId so re-scheduling replaces the previous job.
    // If the user adds more items, we reset the 1-hour clock.
    await this.recoveryQueue.add(
      'check-abandoned',
      { userId, cartId },
      {
        jobId: `cart-recovery:${userId}`,   // deterministic ID → upserts instead of duplicates
        delay: ABANDON_DELAY_MS,
        removeOnComplete: true,
        removeOnFail: 3,
      },
    );
  }

  // Cancel the pending check when the user places an order
  async cancelCheck(userId: string): Promise<void> {
    const job = await this.recoveryQueue.getJob(`cart-recovery:${userId}`);
    await job?.remove();
  }
}
