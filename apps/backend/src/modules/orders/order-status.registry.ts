import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Subject, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import type { MessageEvent } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrderStatusChangedEvent } from '@/modules/events/order.events';

const TERMINAL_STATUSES = new Set<OrderStatus>([
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
]);

@Injectable()
export class OrderStatusRegistry {
  private readonly logger = new Logger(OrderStatusRegistry.name);
  private readonly subjects = new Map<string, Subject<MessageEvent>>();
  private readonly refCounts = new Map<string, number>();

  getStream(orderId: string): Observable<MessageEvent> {
    if (!this.subjects.has(orderId)) {
      this.subjects.set(orderId, new Subject<MessageEvent>());
      this.refCounts.set(orderId, 0);
    }

    this.refCounts.set(orderId, (this.refCounts.get(orderId) ?? 0) + 1);

    return (this.subjects.get(orderId) as Subject<MessageEvent>).asObservable().pipe(
      finalize(() => {
        const count = (this.refCounts.get(orderId) ?? 1) - 1;
        if (count <= 0) {
          this.subjects.delete(orderId);
          this.refCounts.delete(orderId);
          this.logger.debug(`Stream cleaned up orderId=${orderId}`);
        } else {
          this.refCounts.set(orderId, count);
        }
      }),
    );
  }

  @OnEvent(OrderStatusChangedEvent.EVENT_NAME)
  handleStatusChanged(event: OrderStatusChangedEvent): void {
    const subject = this.subjects.get(event.orderId);
    if (!subject) return;

    subject.next({
      data: { orderId: event.orderId, status: event.newStatus, updatedAt: event.updatedAt },
      type: 'order.status_changed',
    });

    if (TERMINAL_STATUSES.has(event.newStatus)) {
      subject.complete();
      this.subjects.delete(event.orderId);
      this.refCounts.delete(event.orderId);
      this.logger.log(`Stream completed (terminal status) orderId=${event.orderId}`);
    }
  }
}
