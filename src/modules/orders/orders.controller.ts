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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CurrentUser, Roles } from '@/common/decorators';
import type { RequestUser } from '@/common/types/request-user.interface';
import { UserRole, OrderStatus } from '@prisma/client';
import { PaginationDto } from '@/common/types/pagination.interface';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create order from cart' })
  @ApiResponse({ status: 201 })
  async create(@CurrentUser() user: RequestUser, @Body() { cartId }: any): Promise<any> {
    return this.ordersService.create(user.id, cartId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user orders' })
  @ApiResponse({ status: 200 })
  async getUserOrders(
    @CurrentUser() user: RequestUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<PaginationDto<any>> {
    return this.ordersService.listUserOrders(user.id, page, limit);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all orders' })
  @ApiResponse({ status: 200 })
  async getAllOrders(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<PaginationDto<any>> {
    return this.ordersService.listAllOrders(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200 })
  async getOrder(@Param('id') id: string): Promise<any> {
    return this.ordersService.findById(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({ status: 200 })
  async updateStatus(
    @Param('id') id: string,
    @Body() { status }: { status: OrderStatus },
  ): Promise<any> {
    return this.ordersService.updateStatus(id, status);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: 200 })
  async cancelOrder(@Param('id') id: string, @CurrentUser() user: RequestUser): Promise<any> {
    return this.ordersService.cancelOrder(id, user.id);
  }
}
