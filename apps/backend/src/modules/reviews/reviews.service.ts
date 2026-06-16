import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { EXCHANGES, ROUTING_KEYS } from '@ecommerce/shared-types';
import type { ReviewApprovedEvent, ReviewRejectedEvent } from '@ecommerce/shared-types';
import { CreateReviewDto } from './dto/create-review.dto';

/*
 - Materialized aggregate pattern:
 - ProductRating is NOT recomputed on every request.
 - It is updated asynchronously when a review is approved/rejected via RabbitMQ.
 - Trade-off: rating may be stale by seconds, acceptable for display purposes.
 */

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly amqp: AmqpConnection,
  ) {}

  async submitReview(userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.productReview.findUnique({
      where: { productId_userId: { productId: dto.productId, userId } },
    });
    if (existing) throw new BadRequestException('You have already reviewed this product');

    return this.prisma.productReview.create({
      data: { id: crypto.randomUUID(), ...dto, userId, updatedAt: new Date() },
    });
  }

  async approveReview(reviewId: string) {
    const review = await this.fetchReviewWithUser(reviewId);
    if (review.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING reviews can be approved');
    }
    const updated = await this.prisma.productReview.update({
      where: { id: reviewId },
      data: { status: 'APPROVED' },
    });
    const event: ReviewApprovedEvent = this.buildEvent(review);
    await this.amqp.publish(EXCHANGES.REVIEW, ROUTING_KEYS.REVIEW.APPROVED, event);
    return updated;
  }

  async rejectReview(reviewId: string) {
    const review = await this.fetchReviewWithUser(reviewId);
    if (review.status === 'REJECTED') {
      throw new BadRequestException('Review is already rejected');
    }
    const updated = await this.prisma.productReview.update({
      where: { id: reviewId },
      data: { status: 'REJECTED' },
    });
    /*
     - Only publish the rejected event if the review was previously APPROVED.
     - Approving a review increments the aggregate; rejecting it must decrement it.
     - Rejecting a PENDING review has no effect on the rating aggregate.
     */
    if (review.status === 'APPROVED') {
      const event: ReviewRejectedEvent = this.buildEvent(review);
      await this.amqp.publish(EXCHANGES.REVIEW, ROUTING_KEYS.REVIEW.REJECTED, event);
    }
    return updated;
  }

  async listForProduct(productId: string) {
    const [reviews, rating] = await Promise.all([
      this.prisma.productReview.findMany({
        where: { productId, status: 'APPROVED' },
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.productRating.findUnique({ where: { productId } }),
    ]);
    return { reviews, avgRating: rating?.avgRating ?? null, reviewCount: rating?.reviewCount ?? 0 };
  }

  async recomputeRating(productId: string): Promise<void> {
    const result = await this.prisma.productReview.aggregate({
      where: { productId, status: 'APPROVED' },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.productRating.upsert({
      where: { productId },
      create: {
        productId,
        avgRating: result._avg.rating ?? 0,
        reviewCount: result._count.rating,
        updatedAt: new Date(),
      },
      update: {
        avgRating: result._avg.rating ?? 0,
        reviewCount: result._count.rating,
        updatedAt: new Date(),
      },
    });
  }

  private async fetchReviewWithUser(reviewId: string) {
    const review = await this.prisma.productReview.findUnique({
      where: { id: reviewId },
      include: { user: { select: { email: true, firstName: true } } },
    });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  private buildEvent(review: {
    id: string;
    productId: string;
    userId: string;
    user: { email: string; firstName: string | null };
  }): ReviewApprovedEvent {
    return {
      messageId: crypto.randomUUID(),
      reviewId: review.id,
      productId: review.productId,
      userId: review.userId,
      userEmail: review.user.email,
      userFirstName: review.user.firstName ?? 'Customer',
    };
  }
}
