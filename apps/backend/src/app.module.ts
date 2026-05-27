import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { UsersModule } from '@/modules/users/users.module';
import { AuthModule } from '@/modules/auth/auth.module';
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
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.local'] }),
    EventEmitterModule.forRoot({ wildcard: false }),
    LoggerModule,
    PrismaModule,
    AuthModule,
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class AppModule {}
