import { Injectable } from '@nestjs/common';
import type { OrderEvent, Prisma } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';

type JsonPayload = Record<string, unknown>;

@Injectable()
export class OrderEventStore {
  constructor(private readonly prisma: PrismaService) {}

  async append(
    orderId: string,
    type: string,
    payload: JsonPayload,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.orderEvent.create({
      data: { orderId, type, payload: payload as Prisma.InputJsonValue },
    });
  }

  async getEvents(orderId: string): Promise<OrderEvent[]> {
    return this.prisma.orderEvent.findMany({
      where: { orderId },
      orderBy: { occurredAt: 'asc' },
    });
  }
}
