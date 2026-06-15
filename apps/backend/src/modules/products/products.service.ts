/* eslint-disable max-lines */
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { isBugScenario } from '@/modules/debug-scenarios/bug-scenario.guard';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CacheService } from '@/modules/cache/cache.service';
import { EXCHANGES, ROUTING_KEYS } from '@ecommerce/shared-types';
import type {
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductDeletedEvent,
} from '@ecommerce/shared-types';
import { UserRole } from '@prisma/client';
import { CreateProductDto, UpdateProductDto, ProductImageDto } from './dto';
import { ProductResponseDto, ProductSearchResponseDto } from './dto/product-response.dto';
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

const PRODUCT_DETAIL_TTL = 300;
const PRODUCT_LIST_TTL = 60;

/*
 - FTS row no longer includes price/cost/stock — those live on ProductVariant.
 - min/max price is derived from a subquery over active variants.
 */
interface ProductFtsRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  minPrice: Decimal | null;
  maxPrice: Decimal | null;
  rank: number;
  avgRating: Decimal | null;
  reviewCount: number;
}

/*
 - Minimum shape required by mapToResponse — satisfied by both list and detail includes.
 */
interface ProductForResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category?: { name: string } | null;
  images?: { id: string; url: string; altText: string | null; isMain: boolean; order: number }[];
  variants?: { price: { toString(): string } }[];
  rating?: { avgRating: Decimal | number; reviewCount: number } | null;
}

/*
 - S8: module-level accumulator that is never cleared — simulates a memory leak.
 - Grows with every product listing request under BUG_SCENARIO=8.
*/
const _memoryLeak: object[] = [];

const VARIANT_INCLUDE = {
  where: { isActive: true },
  include: {
    images: true,
    attributeValues: { include: { option: { include: { variantType: true } } } },
  },
} as const;

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly amqp: AmqpConnection,
  ) {}

  private async withCache<T>(key: string, ttl: number, fetchFn: () => Promise<T>): Promise<T> {
    return this.cache.getOrSet(key, ttl, fetchFn);
  }

  private async invalidateProducts(): Promise<void> {
    await this.cache.invalidateByPattern('products:*');
  }

  // eslint-disable-next-line max-lines-per-function
  async create(
    createProductDto: CreateProductDto,
    actorId?: string,
    actorRole?: UserRole,
  ): Promise<ProductResponseDto> {
    const { categoryId, images, price, cost, stock, ...productData } = createProductDto;

    await this.validateCategoryExists(categoryId);

    const existing = await this.prisma.product.findFirst({ where: { slug: productData.slug } });
    if (existing) throw new ConflictException('Product slug already exists');

    const vendorId = actorRole === UserRole.VENDOR ? actorId : null;
    const product = await this.prisma.product.create({
      data: { ...productData, categoryId, vendorId: vendorId ?? undefined },
      include: { images: true },
    });

    if (images && images.length > 0) {
      await this.addImages(product.id, images);
    }

    // Create a default "base" variant from the price/cost/stock passed at product creation.
    // Subsequent variant management goes through the variants API.
    await this.prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `${product.id.slice(-8).toUpperCase()}-DEFAULT`,
        price: new Decimal(String(price)),
        cost: new Decimal(String(cost)),
        stock: stock ?? 0,
      },
    });

    this.logger.log(`Product created: id=${product.id}, name=${product.name}`);
    await this.invalidateProducts();

    const event: ProductCreatedEvent = {
      productId: product.id,
      name: product.name,
      description: product.description,
      price: Number(price),
      categoryId: product.categoryId,
      slug: product.slug,
    };
    await this.amqp.publish(EXCHANGES.PRODUCT, ROUTING_KEYS.PRODUCT.CREATED, event);

    return this.fetchById(product.id);
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    actorId?: string,
    actorRole?: UserRole,
  ): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
    if (actorRole === UserRole.VENDOR && product.vendorId !== actorId) {
      throw new ForbiddenException('You do not own this product');
    }

    if (updateProductDto.slug && updateProductDto.slug !== product.slug) {
      const existing = await this.prisma.product.findFirst({
        where: { slug: updateProductDto.slug },
      });
      if (existing) throw new ConflictException('Product slug already exists');
    }

    if (updateProductDto.categoryId) {
      await this.validateCategoryExists(updateProductDto.categoryId);
    }

    // price/cost/stock are no longer Product fields — strip them from the update.
    // Use the variants API to change pricing/stock on specific variants.
    const { images, price: _p, cost: _c, stock: _s, ...productData } = updateProductDto;

    const updated = await this.prisma.product.update({
      where: { id },
      data: productData,
      include: { images: true },
    });

    if (images && images.length > 0) {
      await this.addImages(id, images);
    }

    this.logger.log(`Product updated: id=${updated.id}, name=${updated.name}`);
    await this.invalidateProducts();

    const defaultVariant = await this.prisma.productVariant.findFirst({ where: { productId: id } });
    const event: ProductUpdatedEvent = {
      productId: updated.id,
      name: updated.name,
      description: updated.description,
      price: defaultVariant ? Number(defaultVariant.price) : 0,
      categoryId: updated.categoryId,
      slug: updated.slug,
    };
    await this.amqp.publish(EXCHANGES.PRODUCT, ROUTING_KEYS.PRODUCT.UPDATED, event);
    return this.fetchById(id);
  }

  // eslint-disable-next-line max-lines-per-function
  async findAllCursor(
    limit = DEFAULT_CURSOR_LIMIT,
    cursor?: string,
  ): Promise<CursorPageDto<ProductResponseDto>> {
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
          rating: true,
          variants: {
            where: { isActive: true },
            select: { price: true },
            orderBy: { price: 'asc' },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });

      const hasMore = products.length > take;
      const items = hasMore ? products.slice(0, take) : products;
      return buildCursorResponse(
        items.map((p) => this.mapToResponse(p)),
        take,
        hasMore,
      );
    });
  }

  async search(
    term: string,
    limit = DEFAULT_CURSOR_LIMIT,
    cursor?: string,
  ): Promise<CursorPageDto<ProductSearchResponseDto>> {
    const cacheKey = `products:search:${term}:${limit}:${cursor ?? ''}`;
    return this.withCache(cacheKey, PRODUCT_LIST_TTL, () => this.runSearch(term, limit, cursor));
  }

  // eslint-disable-next-line max-lines-per-function
  private async runSearch(
    term: string,
    limit: number,
    cursor?: string,
  ): Promise<CursorPageDto<ProductSearchResponseDto>> {
    const take = Math.min(Math.max(limit, 1), MAX_CURSOR_LIMIT);

    const cursorClause = cursor
      ? (() => {
          const { id, createdAt } = decodeCursor(cursor);
          return Prisma.sql`AND (p."createdAt" < ${new Date(createdAt)} OR (p."createdAt" = ${new Date(createdAt)} AND p.id < ${id}))`;
        })()
      : Prisma.sql``;

    const rows = await this.prisma.$queryRaw<ProductFtsRow[]>(Prisma.sql`
      SELECT
        p.id, p.name, p.slug, p.description,
        p."categoryId", p."isActive", p."createdAt", p."updatedAt",
        MIN(v.price) AS "minPrice",
        MAX(v.price) AS "maxPrice",
        ts_rank(p."searchVector", plainto_tsquery('english', ${term})) AS rank,
        pr."avgRating",
        COALESCE(pr."reviewCount", 0) AS "reviewCount"
      FROM "Product" p
      LEFT JOIN "ProductVariant" v ON v."productId" = p.id AND v."isActive" = true
      LEFT JOIN "ProductRating" pr ON pr."productId" = p.id
      WHERE
        p."isActive" = true
        AND p."searchVector" @@ plainto_tsquery('english', ${term})
        ${cursorClause}
      GROUP BY p.id, p.name, p.slug, p.description, p."categoryId", p."isActive", p."createdAt", p."updatedAt", pr."avgRating", pr."reviewCount"
      ORDER BY rank DESC, p."createdAt" DESC, p.id DESC
      LIMIT ${take + 1}
    `);

    /*
     - S5: synchronous sort of a large array per result — burns CPU and starves the event loop.
     - Signal: Grafana process_cpu_seconds_total spikes; other routes also slow (shared event loop).
    */
    if (isBugScenario(5)) {
      rows.forEach(() => {
        const arr = Array.from({ length: 50_000 }, (_, i) => i);
        arr.sort((a, b) => b - a);
      });
    }

    const hasMore = rows.length > take;
    const items = (hasMore ? rows.slice(0, take) : rows).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      categoryId: row.categoryId,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      priceRange: {
        min: row.minPrice ? Number(row.minPrice) : null,
        max: row.maxPrice ? Number(row.maxPrice) : null,
      },
      searchRank: row.rank,
      avgRating: row.avgRating ? Number(row.avgRating) : null,
      reviewCount: Number(row.reviewCount),
    }));

    return buildCursorResponse(items as ProductSearchResponseDto[], take, hasMore);
  }

  // eslint-disable-next-line max-lines-per-function
  async findAll(page = 1, limit = 20, text?: string): Promise<PaginationDto<ProductResponseDto>> {
    /*
     - S1: throws before cache/DB — every request returns 500.
     - Signal: Grafana HighErrorRate alert; Jaeger spans have error=true with no DB child spans.
    */
    if (isBugScenario(1)) throw new InternalServerErrorException('Database connection lost');

    const cacheKey = `products:list:${page}:${limit}:${text ?? ''}`;
    return this.withCache(cacheKey, PRODUCT_LIST_TTL, () => this.runFindAll(page, limit, text));
  }

  private async runFindAll(
    page: number,
    limit: number,
    text?: string,
  ): Promise<PaginationDto<ProductResponseDto>> {
    const validPage = Math.max(page, 1);
    const validLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (validPage - 1) * validLimit;

    /*
     - S2: single pg_sleep(0.5) makes every listing request take ~500 ms.
     - Signal: Jaeger shows one long prisma span (not dozens like N+1).
    */
    if (isBugScenario(2)) await this.prisma.$queryRaw`SELECT pg_sleep(0.5)`;

    /*
     - S11: 10% of requests sleep 5 s — p50 is fine, p99 is terrible.
     - Signal: Grafana HighP99Latency alert; Jaeger shows random long spans with no extra child spans.
    */
    if (isBugScenario(11) && Math.random() < 0.1) {
      await new Promise((r) => setTimeout(r, 5_000));
    }

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
        where,
        skip,
        take: validLimit,
        include: {
          images: { where: { isMain: true } },
          category: { select: { name: true } },
          rating: true,
          /*
           - S6: variants omitted from include so each product triggers a separate query below.
          */
          ...(isBugScenario(6)
            ? {}
            : {
                variants: {
                  where: { isActive: true },
                  select: { price: true },
                  orderBy: { price: 'asc' },
                },
              }),
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    /*
     - S6: one findMany per product — N+1 pattern.
     - Signal: Jaeger waterfall shows N prisma ProductVariant spans equal to page size.
    */
    if (isBugScenario(6)) {
      for (const product of products) {
        (product as any).variants = await this.prisma.productVariant.findMany({
          where: { productId: product.id },
        });
      }
    }

    /*
     - S8: push every product batch into a never-cleared module-level array.
     - Signal: Grafana nodejs_heap_used_bytes hockey-sticks; HighMemoryUsage alert fires.
    */
    if (isBugScenario(8)) _memoryLeak.push(...products);

    /*
     - S20: open a raw pg.Client per request without closing it — FD leak.
     - Signal: process_open_fds climbs steadily; eventually max_connections exceeded.
    */
    if (isBugScenario(20)) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Client } = require('pg') as typeof import('pg');
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      /* intentionally not calling client.end() */
    }

    return buildPaginationResponse(
      products.map((p) => this.mapToResponse(p)),
      total,
      validPage,
      validLimit,
    );
  }

  async findById(id: string): Promise<ProductResponseDto> {
    return this.withCache(`products:detail:id:${id}`, PRODUCT_DETAIL_TTL, () => this.fetchById(id));
  }

  private async fetchById(id: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: true, category: true, rating: true, variants: VARIANT_INCLUDE },
    });
    if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
    return this.mapToResponse(product);
  }

  async findBySlug(slug: string): Promise<ProductResponseDto> {
    return this.withCache(`products:detail:slug:${slug}`, PRODUCT_DETAIL_TTL, () =>
      this.fetchBySlug(slug),
    );
  }

  private async fetchBySlug(slug: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { images: true, category: true, rating: true, variants: VARIANT_INCLUDE },
    });
    if (!product) throw new NotFoundException(`Product with slug ${slug} not found`);
    return this.mapToResponse(product);
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
    if (!image) throw new NotFoundException(`Image with ID ${imageId} not found`);
    await this.prisma.productImage.delete({ where: { id: imageId } });
  }

  async softDelete(id: string, actorId?: string, actorRole?: UserRole): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
    if (actorRole === UserRole.VENDOR && product.vendorId !== actorId) {
      throw new ForbiddenException('You do not own this product');
    }

    await this.prisma.product.update({ where: { id }, data: { isActive: false } });
    await this.invalidateProducts();
    const event: ProductDeletedEvent = { productId: id };
    await this.amqp.publish(EXCHANGES.PRODUCT, ROUTING_KEYS.PRODUCT.DELETED, event);
  }

  private async validateCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category || !category.isActive) {
      throw new BadRequestException(`Category ${categoryId} does not exist or is inactive`);
    }
  }

  private mapToResponse(product: ProductForResponse): ProductResponseDto {
    const variants = product.variants ?? [];
    const prices = variants.map((v) => parseFloat(v.price.toString()));
    const priceRange =
      prices.length > 0
        ? { min: Math.min(...prices), max: Math.max(...prices) }
        : { min: null, max: null };

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      priceRange,
      categoryId: product.categoryId,
      categoryName: product.category?.name ?? null,
      images: (product.images ?? []).map((img) => ({
        id: img.id,
        url: img.url,
        altText: img.altText,
        isMain: img.isMain,
        order: img.order,
      })),
      variants: variants.map((v) => ({ price: v.price.toString() })),
      isActive: product.isActive,
      avgRating: product.rating ? Number(product.rating.avgRating) : null,
      reviewCount: product.rating?.reviewCount ?? 0,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
