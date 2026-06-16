import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CacheService } from '@/modules/cache/cache.service';
import { calculatePagination, buildPaginationResponse } from '@/common/utils/pagination.util';
import { PaginationDto } from '@/common/types/pagination.interface';
import { parseSortParam, SortDir } from '@/common/utils/sort.util';
import { mapToOrderReadModel } from '../read-models/order-read-model.mapper';
import { OrderReadModel } from '../read-models/order-read-model.types';

function mapOrderSort(field: string, dir: SortDir): Prisma.OrderOrderByWithRelationInput | null {
  const map: Record<string, Prisma.OrderOrderByWithRelationInput> = {
    createdAt: { createdAt: dir },
    totalPrice: { totalPrice: dir },
    status: { status: dir },
  };
  return map[field] ?? null;
}

const READ_MODEL_TTL = 3600;
const ORDER_INCLUDE = { items: { include: { product: true } } } as const;

// Read side of CQRS: reads from the Redis-projected read model; falls back to DB on cache miss.
// Write side lives in OrdersService. Handlers in ../handlers/ keep the read model up to date.
@Injectable()
export class OrderQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async findById(orderId: string): Promise<OrderReadModel> {
    const cached = await this.cache.get<OrderReadModel>(`read:order:${orderId}`);
    if (cached) return cached;
    return this.fetchAndProject(orderId);
  }

  async listUserOrders(
    userId: string,
    page = 1,
    limit = 20,
    sort?: string,
  ): Promise<PaginationDto<OrderReadModel>> {
    const { skip, take } = calculatePagination(page, limit);
    const sortOrder = parseSortParam(sort, mapOrderSort);
    const orderBy = sortOrder.length > 0 ? sortOrder : [{ createdAt: 'desc' as const }];
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        skip,
        take,
        include: ORDER_INCLUDE,
        orderBy,
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);
    return buildPaginationResponse(orders.map(mapToOrderReadModel), total, page, limit);
  }

  async listAllOrders(page = 1, limit = 20, sort?: string): Promise<PaginationDto<OrderReadModel>> {
    const { skip, take } = calculatePagination(page, limit);
    const sortOrder = parseSortParam(sort, mapOrderSort);
    const orderBy = sortOrder.length > 0 ? sortOrder : [{ createdAt: 'desc' as const }];
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({ skip, take, include: ORDER_INCLUDE, orderBy }),
      this.prisma.order.count(),
    ]);
    return buildPaginationResponse(orders.map(mapToOrderReadModel), total, page, limit);
  }

  private async fetchAndProject(orderId: string): Promise<OrderReadModel> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    const readModel = mapToOrderReadModel(order);
    await this.cache.set(`read:order:${orderId}`, readModel, READ_MODEL_TTL);
    return readModel;
  }
}
