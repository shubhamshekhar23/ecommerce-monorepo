import { Injectable } from '@nestjs/common';
import type { OrderEvent } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { OrderEventStore } from './order-event-store.service';

export interface OrderState {
  orderId: string;
  status: string;
  totalPrice: number;
  cancelReason?: string;
  trackingNumber?: string;
  paidAt?: string;
}

/*
 - Snapshot every N events to avoid full replays on hot orders.
 - On read: load the latest snapshot, then replay only events with
 - occurredAt > snapshot.createdAt. On append: if total event count
 - is a multiple of SNAPSHOT_INTERVAL, create a new snapshot.
 */
const SNAPSHOT_INTERVAL = 10;

@Injectable()
export class OrderProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStore: OrderEventStore,
  ) {}

  async project(orderId: string): Promise<OrderState> {
    const snapshot = await this.prisma.orderSnapshot.findUnique({ where: { orderId } });
    const events = snapshot
      ? await this.prisma.orderEvent.findMany({
          where: { orderId, occurredAt: { gt: snapshot.createdAt } },
          orderBy: { occurredAt: 'asc' },
        })
      : await this.eventStore.getEvents(orderId);

    const base = snapshot ? (snapshot.state as unknown as OrderState) : this.initialState(orderId);

    return events.reduce((state, event) => this.applyEvent(state, event), base);
  }

  async appendAndMaybeSnapshot(
    orderId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.eventStore.append(orderId, type, payload);
    const count = await this.prisma.orderEvent.count({ where: { orderId } });
    if (count % SNAPSHOT_INTERVAL === 0) {
      await this.takeSnapshot(orderId, count);
    }
  }

  private async takeSnapshot(orderId: string, eventSeq: number): Promise<void> {
    const state = await this.project(orderId);
    await this.prisma.orderSnapshot.upsert({
      where: { orderId },
      update: { state: state as unknown as Record<string, unknown>, eventSeq },
      create: { orderId, state: state as unknown as Record<string, unknown>, eventSeq },
    });
  }

  private applyEvent(state: OrderState, event: OrderEvent): OrderState {
    const payload = event.payload as Record<string, unknown>;
    switch (event.type) {
      case 'ORDER_CREATED':
        return {
          ...state,
          status: 'PENDING',
          totalPrice: Number(payload.totalPrice ?? state.totalPrice),
        };
      case 'ORDER_PAID':
        return { ...state, status: 'PAID', paidAt: String(payload.paidAt ?? '') };
      case 'FULFILLMENT_CONFIRMED':
      case 'ORDER_PROCESSING':
        return { ...state, status: 'PROCESSING' };
      case 'ORDER_SHIPPED':
        return {
          ...state,
          status: 'SHIPPED',
          trackingNumber: String(payload.trackingNumber ?? ''),
        };
      case 'ORDER_DELIVERED':
        return { ...state, status: 'DELIVERED' };
      case 'ORDER_CANCELLED':
        return { ...state, status: 'CANCELLED', cancelReason: String(payload.reason ?? '') };
      case 'REFUND_INITIATED':
        return { ...state, status: 'REFUND_REQUESTED' };
      case 'REFUND_COMPLETED':
        return { ...state, status: 'REFUNDED' };
      default:
        return state;
    }
  }

  private initialState(orderId: string): OrderState {
    return { orderId, status: 'PENDING', totalPrice: 0 };
  }
}
