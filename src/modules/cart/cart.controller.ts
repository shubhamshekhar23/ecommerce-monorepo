import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { CurrentUser } from '@/common/decorators';
import type { RequestUser } from '@/common/types/request-user.interface';

@ApiTags('cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user cart' })
  @ApiResponse({ status: 200 })
  async getCart(@CurrentUser() user: RequestUser): Promise<any> {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201 })
  async addItem(
    @CurrentUser() user: RequestUser,
    @Body() { productId, quantity }: any,
  ): Promise<any> {
    return this.cartService.addItem(user.id, productId, quantity);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200 })
  async updateItem(
    @CurrentUser() user: RequestUser,
    @Param('itemId') itemId: string,
    @Body() { quantity }: any,
  ): Promise<any> {
    return this.cartService.updateItem(user.id, itemId, quantity);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 204 })
  async removeItem(
    @CurrentUser() user: RequestUser,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    await this.cartService.removeItem(user.id, itemId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear entire cart' })
  @ApiResponse({ status: 204 })
  async clearCart(@CurrentUser() user: RequestUser): Promise<void> {
    await this.cartService.clearCart(user.id);
  }
}
