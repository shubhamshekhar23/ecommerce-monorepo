import { Injectable, Logger } from "@nestjs/common";
import { RabbitSubscribe, Nack } from "@golevelup/nestjs-rabbitmq";
import { MailerService } from "@nestjs-modules/mailer";
import { ConfigService } from "@nestjs/config";
import { EXCHANGES, QUEUES, ROUTING_KEYS } from "@ecommerce/shared-types";
import type {
  ReviewApprovedEvent,
  ReviewRejectedEvent,
} from "@ecommerce/shared-types";

@Injectable()
export class ReviewConsumer {
  private readonly logger = new Logger(ReviewConsumer.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly config: ConfigService,
  ) {}

  @RabbitSubscribe({
    exchange: EXCHANGES.REVIEW,
    routingKey: ROUTING_KEYS.REVIEW.APPROVED,
    queue: QUEUES.REVIEW_NOTIFICATIONS,
    queueOptions: { durable: true },
  })
  async handleReviewApproved(event: ReviewApprovedEvent): Promise<void | Nack> {
    this.logger.log(
      `Review approved: reviewId=${event.reviewId} email=${event.userEmail}`,
    );
    try {
      await this.mailerService.sendMail({
        to: event.userEmail,
        subject: "Your review is now live",
        template: "review-approved",
        context: {
          firstName: event.userFirstName,
          appUrl: this.config.get("app.url"),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send review-approved email: reviewId=${event.reviewId}`,
        error,
      );
      return new Nack(false);
    }
  }

  @RabbitSubscribe({
    exchange: EXCHANGES.REVIEW,
    routingKey: ROUTING_KEYS.REVIEW.REJECTED,
    queue: `${QUEUES.REVIEW_NOTIFICATIONS}.rejected`,
    queueOptions: { durable: true },
  })
  async handleReviewRejected(event: ReviewRejectedEvent): Promise<void | Nack> {
    this.logger.log(
      `Review rejected: reviewId=${event.reviewId} email=${event.userEmail}`,
    );
    try {
      await this.mailerService.sendMail({
        to: event.userEmail,
        subject: "Update on your review",
        template: "review-rejected",
        context: {
          firstName: event.userFirstName,
          appUrl: this.config.get("app.url"),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send review-rejected email: reviewId=${event.reviewId}`,
        error,
      );
      return new Nack(false);
    }
  }
}
