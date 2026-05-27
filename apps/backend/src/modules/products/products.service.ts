/* eslint-disable max-lines */
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CacheService } from '@/modules/cache/cache.service';
import { CreateProductDto, UpdateProductDto, ProductImageDto } from './dto';
import { buildPaginationResponse } from '@/common/utils/pagination.util';
import {
  buildCursorWhere,
  buildCursorResponse,
  decodeCursor,
  DEFAULT_CURSOR_LIMIT,
  MAX_CURSOR_LIMIT,
} from '@/common/utils/cursor-pagination.util';
import { PaginationDto } from '@/common/types/pagination.interface';
import { CursorPageDto } from '@/common/types/cursor-pagination.interface';

const PRODUCT_DETAIL_TTL = 300; // 5 min — individual products change infrequently
const PRODUCT_LIST_TTL = 60;   // 1 min — list/search results can be slightly stale

// Raw FTS row shape returned by $queryRaw
interface ProductFtsRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: Decimal;
  cost: Decimal;
  stock: number;
  categoryId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  rank: number;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // Cache-aside: check cache → on miss, fetch from DB → populate cache → return.
  // fetchFn errors (e.g. NotFoundException) propagate naturally; cache.set is never called.
  private async withCache<T>(key: string, ttl: number, fetchFn: () => Promise<T>): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== null) return cached;
    const value = await fetchFn();
    await this.cache.set(key, value, ttl);
    return value;
  }

  // Invalidate all product caches on any mutation.
  // Using a wildcard pattern is aggressive but safe; a production system would
  // invalidate more selectively (e.g. only the affected product's detail key + all list keys).
  private async invalidateProducts(): Promise<void> {
    await this.cache.invalidateByPattern('products:*');
  }

  // eslint-disable-next-line max-lines-per-function
  async create(createProductDto: CreateProductDto): Promise<any> {
    const { categoryId, images, ...productData } = createProductDto;

    await this.validateCategoryExists(categoryId);

    const existing = await this.prisma.product.findFirst({
      where: { OR: [{ slug: productData.slug }] },
    });

    if (existing) {
      throw new ConflictException('Product slug already exists');
    }

    const product = await this.prisma.product.create({
      data: {
        ...productData,
        price: new Decimal(String(productData.price)),
        cost: new Decimal(String(productData.cost)),
        categoryId,
      },
      include: { images: true },
    });

    if (images && images.length > 0) {
      await this.addImages(product.id, images);
    }

    this.logger.log(`Product created: id=${product.id}, name=${product.name}`);
    await this.invalidateProducts();
    return this.mapToResponse(product);
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<any> {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (updateProductDto.slug && updateProductDto.slug !== product.slug) {
      const existing = await this.prisma.product.findFirst({
        where: { slug: updateProductDto.slug },
      });
      if (existing) {
        throw new ConflictException('Product slug already exists');
      }
    }

    if (updateProductDto.categoryId) {
      await this.validateCategoryExists(updateProductDto.categoryId);
    }

    const { images, ...productData } = updateProductDto;

    const updateData: any = { ...productData };

    if (productData.price !== undefined) {
      updateData.price = new Decimal(String(productData.price));
    }
    if (productData.cost !== undefined) {
      updateData.cost = new Decimal(String(productData.cost));
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: { images: true },
    });

    if (images && images.length > 0) {
      await this.addImages(id, images);
    }

    this.logger.log(`Product updated: id=${updated.id}, name=${updated.name}`);
    await this.invalidateProducts();
    return this.mapToResponse(updated);
  }

  // Cursor-based pagination — O(log n) regardless of depth via index seek.
  // Contrast with offset: at page=2500 (skip=50000), Postgres must scan and discard
  // 50 000 rows before returning 20. Run EXPLAIN ANALYZE on both to see it.
  // eslint-disable-next-line max-lines-per-function
  async findAllCursor(limit = DEFAULT_CURSOR_LIMIT, cursor?: string): Promise<CursorPageDto<any>> {
    const cacheKey = `products:cursor:${limit}:${cursor ?? ''}`;
    return this.withCache(cacheKey, PRODUCT_LIST_TTL, async () => {
      const take = Math.min(Math.max(limit, 1), MAX_CURSOR_LIMIT);
      const cursorWhere = buildCursorWhere(cursor);

      const products = await this.prisma.product.findMany({
        where: { isActive: true, ...cursorWhere },
        take: take + 1,
        include: {
          images: { where: { isMain: true } },
          category: { select: { name: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });

      const hasMore = products.length > take;
      const items = hasMore ? products.slice(0, take) : products;
      return buildCursorResponse(items.map((p) => this.mapToResponse(p)), take, hasMore);
    });
  }

  // Full-text search using Postgres built-in tsvector + GIN index.
  // searchVector is a GENERATED ALWAYS AS column (see migration) — Postgres maintains it.
  // @@ operator: match. plainto_tsquery: parse natural language (no special syntax needed).
  // ts_rank: relevance score so better matches come first.
  // Prisma.sql tag: safe parameterisation without string interpolation (SQL injection safe).
  // eslint-disable-next-line max-lines-per-function
  async search(
    term: string,
    limit = DEFAULT_CURSOR_LIMIT,
    cursor?: string,
  ): Promise<CursorPageDto<any>> {
    const cacheKey = `products:search:${term}:${limit}:${cursor ?? ''}`;
    return this.withCache(cacheKey, PRODUCT_LIST_TTL, () => this.runSearch(term, limit, cursor));
  }

  // eslint-disable-next-line max-lines-per-function
  private async runSearch(term: string, limit: number, cursor?: string): Promise<CursorPageDto<any>> {
    const take = Math.min(Math.max(limit, 1), MAX_CURSOR_LIMIT);

    const cursorClause = cursor
      ? (() => {
          const { id, createdAt } = decodeCursor(cursor);
          return Prisma.sql`AND ("createdAt" < ${new Date(createdAt)} OR ("createdAt" = ${new Date(createdAt)} AND id < ${id}))`;
        })()
      : Prisma.sql``;

    const rows = await this.prisma.$queryRaw<ProductFtsRow[]>(Prisma.sql`
      SELECT
        id, name, slug, description, price, cost, stock,
        "categoryId", "isActive", "createdAt", "updatedAt",
        ts_rank("searchVector", plainto_tsquery('english', ${term})) AS rank
      FROM "Product"
      WHERE
        "isActive" = true
        AND "searchVector" @@ plainto_tsquery('english', ${term})
        ${cursorClause}
      ORDER BY rank DESC, "createdAt" DESC, id DESC
      LIMIT ${take + 1}
    `);

    const hasMore = rows.length > take;
    const items = (hasMore ? rows.slice(0, take) : rows).map((row) => ({
      id: row.id, name: row.name, slug: row.slug, description: row.description,
      price: row.price, cost: row.cost, stock: row.stock, categoryId: row.categoryId,
      isActive: row.isActive, createdAt: row.createdAt, updatedAt: row.updatedAt,
      searchRank: row.rank,
    }));

    return buildCursorResponse(items as any, take, hasMore);
  }

  // Legacy offset pagination — kept for backward compat. Prefer findAllCursor.
  // eslint-disable-next-line max-lines-per-function
  async findAll(page = 1, limit = 20, text?: string): Promise<PaginationDto<any>> {
    const cacheKey = `products:list:${page}:${limit}:${text ?? ''}`;
    return this.withCache(cacheKey, PRODUCT_LIST_TTL, () => this.runFindAll(page, limit, text));
  }

  // eslint-disable-next-line max-lines-per-function
  private async runFindAll(page: number, limit: number, text?: string): Promise<PaginationDto<any>> {
    const validPage = Math.max(page, 1);
    const validLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (validPage - 1) * validLimit;

    const where = {
      isActive: true,
      ...(text && {
        OR: [
          { name: { contains: text, mode: 'insensitive' as const } },
          { description: { contains: text, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where, skip, take: validLimit,
        include: { images: { where: { isMain: true } }, category: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return buildPaginationResponse(products.map((p) => this.mapToResponse(p)), total, validPage, validLimit);
  }

  async findById(id: string): Promise<any> {
    return this.withCache(`products:detail:id:${id}`, PRODUCT_DETAIL_TTL, () => this.fetchById(id));
  }

  private async fetchById(id: string): Promise<any> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: true, category: true,
        variants: {
          where: { isActive: true },
          include: { images: true, attributeValues: { include: { option: { include: { variantType: true } } } } },
        },
      },
    });
    if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
    return this.mapToResponse(product);
  }

  async findBySlug(slug: string): Promise<any> {
    return this.withCache(`products:detail:slug:${slug}`, PRODUCT_DETAIL_TTL, () => this.fetchBySlug(slug));
  }

  private async fetchBySlug(slug: string): Promise<any> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        images: true, category: true,
        variants: {
          where: { isActive: true },
          include: { images: true, attributeValues: { include: { option: { include: { variantType: true } } } } },
        },
      },
    });
    if (!product) throw new NotFoundException(`Product with slug ${slug} not found`);
    return this.mapToResponse(product);
  }

  async updateStock(id: string, quantity: number): Promise<void> {
    if (quantity < 0) {
      throw new BadRequestException('Stock quantity cannot be negative');
    }

    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.prisma.product.update({
      where: { id },
      data: { stock: quantity },
    });
    await this.invalidateProducts();
  }

  async deductStock(productId: string, quantity: number): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (product.stock < quantity) {
      throw new BadRequestException('Insufficient stock available');
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: { stock: { decrement: quantity } },
    });
    await this.invalidateProducts();
  }

  async addImages(productId: string, images: ProductImageDto[]): Promise<void> {
    await Promise.all(
      images.map((img, index) =>
        this.prisma.productImage.create({
          data: {
            productId,
            url: img.url,
            altText: img.altText,
            isMain: img.isMain || index === 0,
            order: img.order || index,
          },
        }),
      ),
    );
  }

  async removeImage(imageId: string): Promise<void> {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image) {
      throw new NotFoundException(`Image with ID ${imageId} not found`);
    }

    await this.prisma.productImage.delete({ where: { id: imageId } });
  }

  async softDelete(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    await this.invalidateProducts();
  }

  private async validateCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category || !category.isActive) {
      throw new BadRequestException(`Category ${categoryId} does not exist or is inactive`);
    }
  }

  private mapToResponse(product: any): any {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      categoryId: product.categoryId,
      categoryName: product.category?.name ?? null,
      images: product.images || [],
      variants: product.variants || [],
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
