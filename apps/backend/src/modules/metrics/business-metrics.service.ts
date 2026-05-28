import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge } from 'prom-client';

// Business metrics answer "is the business healthy?" — not just "is the server up?".
// These four tell you immediately if something broke in the order or payment flow.
//
// Cardinality rule: labels must be low-cardinality (status, method, route).
// NEVER use userId or orderId as a label — that creates one time-series per entity
// and will OOM Prometheus within hours on a real workload.
@Injectable()
export class BusinessMetricsService {
  constructor(
    @InjectMetric('orders_total') private readonly ordersTotal: Counter<string>,
    @InjectMetric('payment_events_total') private readonly paymentEventsTotal: Counter<string>,
    @InjectMetric('payment_success_rate_percent') private readonly paymentSuccessRate: Gauge<string>,
    @InjectMetric('cart_to_order_conversion_rate') private readonly cartConversionRate: Gauge<string>,
    @InjectMetric('inventory_reservation_failures_total') private readonly inventoryFailures: Counter<string>,
  ) {}

  recordOrder(status: string): void {
    this.ordersTotal.labels({ status }).inc();
  }

  recordPaymentEvent(status: 'succeeded' | 'failed' | 'refunded'): void {
    this.paymentEventsTotal.labels({ status }).inc();
  }

  setPaymentSuccessRate(rate: number): void {
    this.paymentSuccessRate.set(rate);
  }

  setCartConversionRate(rate: number): void {
    this.cartConversionRate.set(rate);
  }

  recordInventoryReservationFailure(): void {
    this.inventoryFailures.inc();
  }
}
