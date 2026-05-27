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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { IdempotencyInterceptor } from '@/common/interceptors';
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
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Create order from cart (idempotent via X-Idempotency-Key header)' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'Request already in-flight for this idempotency key' })
  async create(@CurrentUser() user: RequestUser, @Body() { cartId }: { cartId?: string }): Promise<unknown> {
    return this.ordersService.create(user.id, cartId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user orders' })
  async getUserOrders(
    @CurrentUser() user: RequestUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<PaginationDto<unknown>> {
    return this.ordersService.listUserOrders(user.id, page, limit);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all orders (admin)' })
  async getAllOrders(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<PaginationDto<unknown>> {
    return this.ordersService.listAllOrders(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  async getOrder(@Param('id') id: string): Promise<unknown> {
    return this.ordersService.findById(id);
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

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order' })
  async cancelOrder(@Param('id') id: string, @CurrentUser() user: RequestUser): Promise<unknown> {
    return this.ordersService.cancelOrder(id, user.id);
  }
}
