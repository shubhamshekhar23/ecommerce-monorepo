import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { UsersModule } from '@/modules/users/users.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { CategoriesModule } from '@/modules/categories/categories.module';
import { ProductsModule } from '@/modules/products/products.module';
import { CartModule } from '@/modules/cart/cart.module';
import { OrdersModule } from '@/modules/orders/orders.module';
import { StripeModule } from '@/modules/stripe/stripe.module';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    StripeModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
