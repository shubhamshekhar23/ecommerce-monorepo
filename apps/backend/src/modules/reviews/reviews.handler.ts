import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { ReviewsService, REVIEW_APPROVED_EVENT } from './reviews.service';

// Event handler that keeps the ProductRating aggregate in sync.
// Decoupled: ReviewsService emits → this handler reacts.
// The review submission code has no knowledge of rating aggregation.
@Injectable()
export class ReviewsHandler {
  constructor(private readonly reviewsService: ReviewsService) {}

  @OnEvent(REVIEW_APPROVED_EVENT)
  async handleReviewApproved(payload: { productId: string }): Promise<void> {
    await this.reviewsService.recomputeRating(payload.productId);
  }
}
