import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

// Materialized aggregate pattern:
// ProductRating is NOT recomputed on every request.
// It is updated asynchronously when a review is approved via an event.
// Trade-off: rating may be stale by seconds, acceptable for display purposes.
// Never use the aggregate for business decisions (e.g. showing stock) — query the source.
export const REVIEW_APPROVED_EVENT = 'review.approved';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
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
    const review = await this.prisma.productReview.update({
      where: { id: reviewId },
      data: { status: 'APPROVED' },
    });
    // Emit event — the handler below recomputes the aggregate
    this.eventEmitter.emit(REVIEW_APPROVED_EVENT, { productId: review.productId });
    return review;
  }

  async rejectReview(reviewId: string) {
    return this.prisma.productReview.update({
      where: { id: reviewId },
      data: { status: 'REJECTED' },
    });
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

  // Called by event handler — recomputes the materialized aggregate from the source of truth.
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
}
