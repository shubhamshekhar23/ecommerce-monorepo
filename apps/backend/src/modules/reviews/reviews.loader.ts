import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import type { ProductReview } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';

/*
 - REQUEST-scoped so each GraphQL operation gets its own DataLoader instance.
 - Batching is per-operation: all load(productId) calls within one event loop tick
 - are collapsed into a single WHERE productId IN (...) query.
 */
@Injectable({ scope: Scope.REQUEST })
export class ReviewsLoader {
  private readonly loader: DataLoader<string, ProductReview[]>;

  constructor(private readonly prisma: PrismaService) {
    this.loader = new DataLoader<string, ProductReview[]>((ids) => this.batchLoad([...ids]));
  }

  load(productId: string): Promise<ProductReview[]> {
    return this.loader.load(productId);
  }

  private async batchLoad(productIds: string[]): Promise<ProductReview[][]> {
    const reviews = await this.prisma.productReview.findMany({
      where: { productId: { in: productIds }, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
    });

    const byProductId = new Map<string, ProductReview[]>(productIds.map((id) => [id, []]));
    for (const review of reviews) {
      byProductId.get(review.productId)?.push(review);
    }
    return productIds.map((id) => byProductId.get(id) ?? []);
  }
}
