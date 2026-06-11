import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { isBugScenario } from '@/modules/debug-scenarios/bug-scenario.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CsvImportService } from './csv-import.service';
import { CreateProductDto, UpdateProductDto } from './dto';
import { Public, Roles } from '@/common/decorators';
import { UserRole } from '@prisma/client';
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
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product' })
  async create(@Body() createProductDto: CreateProductDto): Promise<any> {
    return this.productsService.create(createProductDto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product' })
  async update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto): Promise<any> {
    return this.productsService.update(id, updateProductDto);
  }

  // Cursor pagination endpoint — use this for infinite scroll / "load more" UIs.
  // cursor is an opaque base64 token returned in meta.nextCursor from the previous page.
  @Get('cursor')
  @Public()
  @ApiOperation({ summary: 'List products with cursor-based pagination (recommended)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String, description: 'Opaque cursor from previous response meta.nextCursor' })
  async findAllCursor(
    @Query('limit') limit = 20,
    @Query('cursor') cursor?: string,
  ): Promise<CursorPageDto<any>> {
    return this.productsService.findAllCursor(Number(limit), cursor);
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
    @Query('cursor') cursor?: string,
  ): Promise<CursorPageDto<any>> {
    return this.productsService.search(term, Number(limit), cursor);
  }

  // Legacy offset pagination — kept for backward compat. Use /products/cursor instead.
  @Get()
  @Public()
  @ApiOperation({ summary: 'List products (offset pagination — use /products/cursor for new clients)' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('text') text?: string,
  ): Promise<PaginationDto<any>> {
    /*
     - S19: returns 400 for all product listing requests.
     - Signal: Grafana ErrorRateByClass shows 4xx band (not 5xx); Loki needs status-code query, not level=error.
    */
    if (isBugScenario(19)) throw new BadRequestException('Invalid request parameters');
    return this.productsService.findAll(page, limit, text);
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
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete product' })
  async softDelete(@Param('id') id: string): Promise<void> {
    await this.productsService.softDelete(id);
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
