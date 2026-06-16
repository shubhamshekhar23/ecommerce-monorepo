import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  Sse,
  Header,
} from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrderQueryService } from './queries/order-query.service';
import { OrderStatusRegistry } from './order-status.registry';
import { OrderEventStore } from './order-event-store.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { IdempotencyInterceptor } from '@/common/interceptors';
import { RateLimit } from '@/modules/rate-limit/rate-limit.decorator';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import type { RequestUser } from '@/common/types/request-user.interface';
import { UserRole, OrderStatus } from '@prisma/client';
import { PaginationDto } from '@/common/types/pagination.interface';

// IdempotencyInterceptor needs PrismaService; declaring it with useClass requires
// that PrismaModule is importable from this controller's module (OrdersModule
// already imports PrismaModule — so injection works via NestJS DI).
void PrismaModule;

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderQueryService: OrderQueryService,
    private readonly orderStatusRegistry: OrderStatusRegistry,
    private readonly orderEventStore: OrderEventStore,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit({ limit: 10, windowMs: 60 * 60 * 1000, keyStrategy: 'user' }) // 10 orders/hour per user
  @ApiOperation({ summary: 'Create order from cart (idempotent via X-Idempotency-Key header)' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'Request already in-flight for this idempotency key' })
  @ApiResponse({ status: 429, description: 'Too many order attempts' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() { cartId }: { cartId?: string },
  ): Promise<unknown> {
    return this.ordersService.create(user.id, cartId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user orders' })
  async getUserOrders(
    @CurrentUser() user: RequestUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('sort') sort?: string,
  ): Promise<PaginationDto<unknown>> {
    return this.orderQueryService.listUserOrders(user.id, page, limit, sort);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all orders (admin)' })
  async getAllOrders(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('sort') sort?: string,
  ): Promise<PaginationDto<unknown>> {
    return this.orderQueryService.listAllOrders(page, limit, sort);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  async getOrder(@Param('id') id: string): Promise<unknown> {
    return this.orderQueryService.findById(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update order status (admin)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() { status }: { status: OrderStatus },
  ): Promise<unknown> {
    return this.ordersService.updateStatus(id, status);
  }

  @Sse(':id/status-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('X-Accel-Buffering', 'no')
  @ApiOperation({ summary: 'SSE stream of real-time order status updates' })
  @ApiResponse({ status: 200, description: 'Event stream (text/event-stream)' })
  getStatusStream(
    @Param('id') id: string,
    @CurrentUser() _user: RequestUser,
  ): Observable<MessageEvent> {
    return this.orderStatusRegistry.getStream(id);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'Get order event log (append-only audit trail)' })
  async getEvents(@Param('id') id: string): Promise<unknown[]> {
    return this.orderEventStore.getEvents(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order' })
  async cancelOrder(@Param('id') id: string, @CurrentUser() user: RequestUser): Promise<unknown> {
    return this.ordersService.cancelOrder(id, user.id);
  }
}
