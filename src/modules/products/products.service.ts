import { Decimal } from '@prisma/client/runtime/library';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateProductDto, ProductImageDto } from './dto';
import { calculatePagination, buildPaginationResponse } from '@/common/utils/pagination.util';
import { PaginationDto } from '@/common/types/pagination.interface';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.mapToResponse(product);
  }

  async findAll(page = 1, limit = 20): Promise<PaginationDto<any>> {
    const { skip, take } = calculatePagination(page, limit);

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { isActive: true },
        skip,
        take,
        include: { images: { where: { isMain: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where: { isActive: true } }),
    ]);

    return buildPaginationResponse(
      products.map((p) => this.mapToResponse(p)),
      total,
      page,
      limit,
    );
  }

  async findById(id: string): Promise<any> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: true, category: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return this.mapToResponse(product);
  }

  async findBySlug(slug: string): Promise<any> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { images: true, category: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug ${slug} not found`);
    }

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
      images: product.images || [],
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
