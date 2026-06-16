import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';
import { EXCHANGES, QUEUES, ROUTING_KEYS } from '@ecommerce/shared-types';
import type { ReviewApprovedEvent, ReviewRejectedEvent } from '@ecommerce/shared-types';
import { AuditService } from '@/modules/audit/audit.service';
import { InboxService } from '@/modules/inbox/inbox.service';
import { ReviewsService } from './reviews.service';

@Injectable()
export class ReviewConsumer {
  private readonly logger = new Logger(ReviewConsumer.name);

  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly auditService: AuditService,
    private readonly inbox: InboxService,
  ) {}

  @RabbitSubscribe({
    exchange: EXCHANGES.REVIEW,
    routingKey: ROUTING_KEYS.REVIEW.APPROVED,
    queue: QUEUES.REVIEW_RATING,
    queueOptions: { durable: true },
  })
  async handleReviewApproved(event: ReviewApprovedEvent): Promise<void | Nack> {
    if (await this.inbox.isProcessed(event.messageId)) return;
    try {
      await this.reviewsService.recomputeRating(event.productId);
      void this.auditService.log({
        action: 'review.approved',
        entity: 'ProductReview',
        entityId: event.reviewId,
        userId: event.userId,
        userEmail: event.userEmail,
      });
      await this.inbox.markProcessed(event.messageId);
    } catch (err) {
      this.logger.error(`Failed handling review.approved for ${event.reviewId}`, err);
      return new Nack(false);
    }
  }

  @RabbitSubscribe({
    exchange: EXCHANGES.REVIEW,
    routingKey: ROUTING_KEYS.REVIEW.REJECTED,
    queue: QUEUES.REVIEW_AUDIT,
    queueOptions: { durable: true },
  })
  async handleReviewRejected(event: ReviewRejectedEvent): Promise<void | Nack> {
    if (await this.inbox.isProcessed(event.messageId)) return;
    try {
      await this.reviewsService.recomputeRating(event.productId);
      void this.auditService.log({
        action: 'review.rejected',
        entity: 'ProductReview',
        entityId: event.reviewId,
        userId: event.userId,
        userEmail: event.userEmail,
      });
      await this.inbox.markProcessed(event.messageId);
    } catch (err) {
      this.logger.error(`Failed handling review.rejected for ${event.reviewId}`, err);
      return new Nack(false);
    }
  }
}
