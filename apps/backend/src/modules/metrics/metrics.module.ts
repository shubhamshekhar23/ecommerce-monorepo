import { Module } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider, makeGaugeProvider } from '@willsoto/nestjs-prometheus';
import { MetricsController } from './metrics.controller';
import { BusinessMetricsService } from './business-metrics.service';

// Why separate business metrics from default metrics?
// Default metrics (CPU, memory, GC, event loop lag) tell you if the server is alive.
// Business metrics (orders placed, payment failures, conversion rate) tell you
// if the business is working. You need both. Paging on "server is down" saves your
// job. Alerting on "payment failures spiked 5x" saves the company money.
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true },
      defaultLabels: {
        app: 'ecommerce-backend',
        environment: process.env.NODE_ENV ?? 'development',
      },
    }),
  ],
  controllers: [MetricsController],
  providers: [
    BusinessMetricsService,
    makeCounterProvider({ name: 'orders_total', help: 'Total orders by status', labelNames: ['status'] }),
    makeCounterProvider({ name: 'payment_events_total', help: 'Payment events by status', labelNames: ['status'] }),
    makeGaugeProvider({ name: 'payment_success_rate_percent', help: 'Payment success rate (0-100)' }),
    makeGaugeProvider({ name: 'cart_to_order_conversion_rate', help: 'Cart to order conversion rate (0-100)' }),
    makeCounterProvider({ name: 'inventory_reservation_failures_total', help: 'Inventory reservation failures' }),
  ],
  exports: [BusinessMetricsService],
})
export class MetricsModule {}
