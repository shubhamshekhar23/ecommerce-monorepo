import { Controller, Post, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators';
import type { RequestUser } from '@/common/types/request-user.interface';
import { StockAlertsService } from './stock-alerts.service';

class SubscribeDto {
  @IsEmail() @ApiProperty() email!: string;
}

@ApiTags('stock-alerts')
@ApiBearerAuth()
@Controller('products/:productId/stock-alerts')
export class StockAlertsController {
  constructor(private readonly stockAlertsService: StockAlertsService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Subscribe to back-in-stock notification' })
  subscribe(
    @CurrentUser() user: RequestUser,
    @Param('productId') productId: string,
    @Body() dto: SubscribeDto,
  ): Promise<void> {
    return this.stockAlertsService.subscribe(user.id, productId, dto.email);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unsubscribe from back-in-stock notification' })
  unsubscribe(
    @CurrentUser() user: RequestUser,
    @Param('productId') productId: string,
  ): Promise<void> {
    return this.stockAlertsService.unsubscribe(user.id, productId);
  }
}
