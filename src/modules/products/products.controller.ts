import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto';
import { Public, Roles } from '@/common/decorators';
import { UserRole } from '@prisma/client';
import { PaginationDto } from '@/common/types/pagination.interface';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201 })
  async create(@Body() createProductDto: CreateProductDto): Promise<any> {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all products with pagination' })
  @ApiResponse({ status: 200 })
  async findAll(@Query('page') page = 1, @Query('limit') limit = 20): Promise<PaginationDto<any>> {
    return this.productsService.findAll(page, limit);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200 })
  async findById(@Param('id') id: string): Promise<any> {
    return this.productsService.findById(id);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get product by slug' })
  @ApiResponse({ status: 200 })
  async findBySlug(@Param('slug') slug: string): Promise<any> {
    return this.productsService.findBySlug(slug);
  }

  @Post(':id/images')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add images to product' })
  @ApiResponse({ status: 201 })
  async addImages(@Param('id') id: string, @Body() images: any[]): Promise<void> {
    await this.productsService.addImages(id, images);
  }

  @Delete('images/:imageId')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove image from product' })
  @ApiResponse({ status: 204 })
  async removeImage(@Param('imageId') imageId: string): Promise<void> {
    await this.productsService.removeImage(imageId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete product' })
  @ApiResponse({ status: 204 })
  async softDelete(@Param('id') id: string): Promise<void> {
    await this.productsService.softDelete(id);
  }
}
