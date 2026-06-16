import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import type { Request } from 'express';
import depthLimit from 'graphql-depth-limit';
import {
  createComplexityRule,
  fieldExtensionsEstimator,
  simpleEstimator,
} from 'graphql-query-complexity';
import { Logger } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { UsersModule } from '@/modules/users/users.module';
import { SecurityModule } from '@/modules/security/security.module';
import { CategoriesModule } from '@/modules/categories/categories.module';
import { ProductsModule } from '@/modules/products/products.module';
import { CartModule } from '@/modules/cart/cart.module';
import { OrdersModule } from '@/modules/orders/orders.module';
import { StripeModule } from '@/modules/stripe/stripe.module';
import { MailModule } from '@/modules/mail/mail.module';
import { UploadModule } from '@/modules/upload/upload.module';
import { LoggerModule } from '@/modules/logger/logger.module';
import { HealthModule } from '@/modules/health/health.module';
import { MetricsModule } from '@/modules/metrics/metrics.module';
import { QueueModule } from '@/modules/queue/queue.module';
import { OutboxModule } from '@/modules/outbox/outbox.module';
import { AdminModule } from '@/modules/admin/admin.module';
import { CacheModule } from '@/modules/cache/cache.module';
import { RateLimitModule } from '@/modules/rate-limit/rate-limit.module';
import { RateLimitGuard } from '@/modules/rate-limit/rate-limit.guard';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { HttpMetricsInterceptor } from '@/modules/metrics/http-metrics.interceptor';
import { SentryExceptionFilter } from '@/common/filters/sentry-exception.filter';
import { CommonModule } from '@/common/common.module';
import { AuditModule } from '@/modules/audit/audit.module';
import { AddressesModule } from '@/modules/addresses/addresses.module';
import { CouponsModule } from '@/modules/coupons/coupons.module';
import { ReviewsModule } from '@/modules/reviews/reviews.module';
import { StockAlertsModule } from '@/modules/stock-alerts/stock-alerts.module';
import { ShippingModule } from '@/modules/shipping/shipping.module';
import { TaxModule } from '@/modules/tax/tax.module';
import { ReturnsModule } from '@/modules/returns/returns.module';
import { InvoiceModule } from '@/modules/invoices/invoice.module';
import { CorrelationIdMiddleware } from '@/common/middleware/correlation-id.middleware';
import { RequestMetricsMiddleware } from '@/common/middleware/request-metrics.middleware';
import { DbAnalyticsModule } from '@/modules/db-analytics/db-analytics.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.local'] }),
    EventEmitterModule.forRoot({ wildcard: false }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: process.env.NODE_ENV !== 'production',
      context: ({ req }: { req: Request }) => ({ req }),
      validationRules: [
        depthLimit(5),
        createComplexityRule({
          estimators: [fieldExtensionsEstimator(), simpleEstimator({ defaultComplexity: 1 })],
          maximumComplexity: 100,
          onComplete: (complexity) => {
            new Logger('GraphQL').debug(`Query complexity: ${complexity}`);
          },
        }),
      ],
    }),
    CommonModule,
    AuditModule,
    LoggerModule,
    AddressesModule,
    CouponsModule,
    ReviewsModule,
    StockAlertsModule,
    ShippingModule,
    TaxModule,
    ReturnsModule,
    InvoiceModule,
    PrismaModule,
    SecurityModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    StripeModule,
    MailModule,
    UploadModule,
    HealthModule,
    MetricsModule,
    QueueModule,
    OutboxModule,
    AdminModule,
    CacheModule,
    RateLimitModule,
    DbAnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: SentryExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
    consumer.apply(RequestMetricsMiddleware).forRoutes('*');
  }
}
