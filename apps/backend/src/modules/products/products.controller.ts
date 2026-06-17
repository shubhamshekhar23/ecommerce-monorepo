import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { isBugScenario } from '@/modules/debug-scenarios/bug-scenario.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CsvImportService } from './csv-import.service';
import { CreateProductDto, UpdateProductDto } from './dto';
import { Public, Roles, CurrentUser } from '@/common/decorators';
import { UserRole } from '@prisma/client';
import type { RequestUser } from '@/common/types/request-user.interface';
import { PaginationDto } from '@/common/types/pagination.interface';
import { CursorPageDto } from '@/common/types/cursor-pagination.interface';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly csvImportService: CsvImportService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product (admin or vendor)' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() createProductDto: CreateProductDto,
  ): Promise<any> {
    return this.productsService.create(createProductDto, user.id, user.role);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product (admin or owning vendor)' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<any> {
    return this.productsService.update(id, updateProductDto, user.id, user.role);
  }

  // Cursor pagination endpoint — use this for infinite scroll / "load more" UIs.
  // cursor is an opaque base64 token returned in meta.nextCursor from the previous page.
  @Get('cursor')
  @Public()
  @ApiOperation({ summary: 'List products with cursor-based pagination (recommended)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: 'Opaque cursor from previous response meta.nextCursor',
  })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'inStock', required: false, type: Boolean })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description: 'Sort fields: name:asc,avgRating:desc',
  })
  @ApiQuery({
    name: 'fields',
    required: false,
    type: String,
    description: 'Scalar fields to fetch from DB: id,name,slug',
  })
  async findAllCursor(
    @Query('limit') limit = 20,
    @Query('cursor') cursor?: string,
    @Query('minPrice') minPriceStr?: string,
    @Query('maxPrice') maxPriceStr?: string,
    @Query('categoryId') categoryId?: string,
    @Query('inStock') inStockStr?: string,
    @Query('sort') sort?: string,
    @Query('fields') fields?: string,
  ): Promise<CursorPageDto<any>> {
    const minPrice = minPriceStr !== undefined ? parseFloat(minPriceStr) : undefined;
    const maxPrice = maxPriceStr !== undefined ? parseFloat(maxPriceStr) : undefined;
    const inStock = inStockStr !== undefined ? inStockStr === 'true' : undefined;
    return this.productsService.findAllCursor(Number(limit), cursor, {
      minPrice,
      maxPrice,
      categoryId,
      inStock,
      sort,
      fields,
    });
  }

  // Full-text search endpoint using PostgreSQL tsvector + GIN index.
  // Results ordered by relevance (ts_rank) then recency.
  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Full-text search products (PostgreSQL FTS)' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  async search(
    @Query('q') term: string,
    @Query('limit') limit = 20,
    @Res({ passthrough: true }) res: Response,
    @Query('cursor') cursor?: string,
  ): Promise<CursorPageDto<any>> {
    const { data, source } = await this.productsService.search(term, Number(limit), cursor);
    res.setHeader('X-Search-Source', source);
    return data;
  }

  // Legacy offset pagination — kept for backward compat. Use /products/cursor instead.
  @Get()
  @Public()
  @ApiOperation({
    summary: 'List products (offset pagination — use /products/cursor for new clients)',
  })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('text') text?: string,
    @Query('sort') sort?: string,
  ): Promise<PaginationDto<any>> {
    /*
     - S19: returns 400 for all product listing requests.
     - Signal: Grafana ErrorRateByClass shows 4xx band (not 5xx); Loki needs status-code query, not level=error.
    */
    if (isBugScenario(19)) throw new BadRequestException('Invalid request parameters');
    return this.productsService.findAll(page, limit, text, sort);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get product by slug' })
  async findBySlug(@Param('slug') slug: string): Promise<any> {
    return this.productsService.findBySlug(slug);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get product by ID (includes active variants)' })
  async findById(@Param('id') id: string): Promise<any> {
    return this.productsService.findById(id);
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
  async removeImage(@Param('imageId') imageId: string): Promise<void> {
    await this.productsService.removeImage(imageId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete product (admin or owning vendor)' })
  async softDelete(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    await this.productsService.softDelete(id, user.id, user.role);
  }

  @Patch(':id/restore')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Restore a soft-deleted product (admin only)' })
  async restore(@Param('id') id: string): Promise<void> {
    await this.productsService.restore(id);
  }

  @Delete(':id/purge')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Hard delete a soft-deleted product (admin only, irreversible)' })
  async purge(@Param('id') id: string): Promise<void> {
    await this.productsService.purge(id);
  }

  // Bulk CSV import — stream processing + validation pipeline.
  // Each row is validated before writing. Valid rows are inserted in batches of 100.
  // Invalid rows are reported in the response without stopping the rest of the import.
  @Post('import/csv')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk import products from CSV (admin only)' })
  async importCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('No file uploaded');
    return this.csvImportService.importProducts(file.buffer);
  }
}
