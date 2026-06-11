import { Module } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider, makeGaugeProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';
import { MetricsController } from './metrics.controller';
import { BusinessMetricsService } from './business-metrics.service';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';

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
    makeHistogramProvider({
      name: 'http_request_duration_ms',
      help: 'HTTP request duration in milliseconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [10, 50, 100, 200, 500, 1000, 2000],
    }),
    makeHistogramProvider({
      name: 'db_client_operation_duration',
      help: 'Database operation duration in seconds',
      labelNames: ['db_operation', 'db_sql_table'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 5],
    }),
    HttpMetricsInterceptor,
  ],
  exports: [
    BusinessMetricsService,
    HttpMetricsInterceptor,
    'PROM_METRIC_HTTP_REQUEST_DURATION_MS',
    'PROM_METRIC_DB_CLIENT_OPERATION_DURATION',
  ],
})
export class MetricsModule {}
