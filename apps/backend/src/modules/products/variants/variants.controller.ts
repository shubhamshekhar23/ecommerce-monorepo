import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VariantsService } from './variants.service';
import { CreateVariantTypeDto, CreateVariantDto, UpdateVariantStockDto } from './dto';
import { Public, Roles } from '@/common/decorators';
import { UserRole } from '@prisma/client';

@ApiTags('product-variants')
@Controller('products/:productId')
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  // ── Variant Types ──────────────────────────────────────────────────────────

  @Post('variant-types')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a variant type (e.g. "Size") with optional initial options' })
  async createVariantType(
    @Param('productId') productId: string,
    @Body() dto: CreateVariantTypeDto,
  ): Promise<any> {
    return this.variantsService.createVariantType(productId, dto);
  }

  @Post('variant-types/:typeId/options')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an option to a variant type (e.g. "XL" to Size)' })
  async addOption(
    @Param('typeId') typeId: string,
    @Body('value') value: string,
  ): Promise<any> {
    return this.variantsService.addOption(typeId, value);
  }

  // ── Product Variants ───────────────────────────────────────────────────────

  @Get('variants')
  @Public()
  @ApiOperation({ summary: 'List all variants for a product' })
  async listVariants(@Param('productId') productId: string): Promise<any[]> {
    return this.variantsService.listVariants(productId);
  }

  @Post('variants')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a product variant (SKU with price/stock/attributes)' })
  async createVariant(
    @Param('productId') productId: string,
    @Body() dto: CreateVariantDto,
  ): Promise<any> {
    return this.variantsService.createVariant(productId, dto);
  }

  @Patch('variants/:variantId/stock')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update stock for a specific variant' })
  async updateVariantStock(
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantStockDto,
  ): Promise<any> {
    return this.variantsService.updateVariantStock(variantId, dto);
  }

  @Delete('variants/:variantId')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a product variant' })
  async softDeleteVariant(@Param('variantId') variantId: string): Promise<void> {
    await this.variantsService.softDeleteVariant(variantId);
  }
}
