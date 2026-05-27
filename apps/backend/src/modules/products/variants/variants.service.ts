import { Decimal } from '@prisma/client/runtime/library';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateVariantTypeDto, CreateVariantDto, UpdateVariantStockDto } from './dto';

@Injectable()
export class VariantsService {
  private readonly logger = new Logger(VariantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createVariantType(productId: string, dto: CreateVariantTypeDto): Promise<any> {
    await this.assertProductExists(productId);

    const existing = await this.prisma.variantType.findUnique({
      where: { productId_name: { productId, name: dto.name } },
    });
    if (existing)
      throw new ConflictException(`Variant type "${dto.name}" already exists on this product`);

    const variantType = await this.prisma.variantType.create({
      data: {
        productId,
        name: dto.name,
        options: dto.options
          ? { createMany: { data: dto.options.map((value) => ({ value })) } }
          : undefined,
      },
      include: { options: true },
    });

    this.logger.log(
      `VariantType created: ${variantType.id} (${variantType.name}) on product ${productId}`,
    );
    return variantType;
  }

  async addOption(variantTypeId: string, value: string): Promise<any> {
    const variantType = await this.prisma.variantType.findUnique({ where: { id: variantTypeId } });
    if (!variantType) throw new NotFoundException(`VariantType ${variantTypeId} not found`);

    const existing = await this.prisma.variantOption.findUnique({
      where: { variantTypeId_value: { variantTypeId, value } },
    });
    if (existing)
      throw new ConflictException(`Option "${value}" already exists in this variant type`);

    return this.prisma.variantOption.create({ data: { variantTypeId, value } });
  }

  // eslint-disable-next-line max-lines-per-function
  async createVariant(productId: string, dto: CreateVariantDto): Promise<any> {
    await this.assertProductExists(productId);

    const skuConflict = await this.prisma.productVariant.findUnique({ where: { sku: dto.sku } });
    if (skuConflict) throw new ConflictException(`SKU "${dto.sku}" already exists`);

    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        sku: dto.sku,
        price: new Decimal(String(dto.price)),
        cost: new Decimal(String(dto.cost)),
        stock: dto.stock ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    if (dto.attributes && dto.attributes.length > 0) {
      await this.linkAttributes(productId, variant.id, dto.attributes);
    }

    this.logger.log(
      `ProductVariant created: ${variant.id} (SKU: ${variant.sku}) on product ${productId}`,
    );
    return this.findVariantById(variant.id);
  }

  async updateVariantStock(variantId: string, dto: UpdateVariantStockDto): Promise<any> {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException(`Variant ${variantId} not found`);

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: dto.stock },
    });
  }

  async listVariants(productId: string): Promise<any[]> {
    await this.assertProductExists(productId);

    return this.prisma.productVariant.findMany({
      where: { productId },
      include: {
        images: true,
        attributeValues: { include: { option: { include: { variantType: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findVariantById(variantId: string): Promise<any> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        images: true,
        attributeValues: { include: { option: { include: { variantType: true } } } },
      },
    });
    if (!variant) throw new NotFoundException(`Variant ${variantId} not found`);
    return variant;
  }

  async softDeleteVariant(variantId: string): Promise<void> {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException(`Variant ${variantId} not found`);

    await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: false },
    });
  }

  private async assertProductExists(productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      throw new NotFoundException(`Product ${productId} not found or inactive`);
    }
  }

  private async linkAttributes(
    productId: string,
    variantId: string,
    attributes: Array<{ typeName: string; optionValue: string }>,
  ): Promise<void> {
    for (const attr of attributes) {
      const variantType = await this.prisma.variantType.findUnique({
        where: { productId_name: { productId, name: attr.typeName } },
      });
      if (!variantType) {
        throw new BadRequestException(
          `VariantType "${attr.typeName}" not found on product ${productId}`,
        );
      }

      const option = await this.prisma.variantOption.findUnique({
        where: { variantTypeId_value: { variantTypeId: variantType.id, value: attr.optionValue } },
      });
      if (!option) {
        throw new BadRequestException(
          `Option "${attr.optionValue}" not found in type "${attr.typeName}"`,
        );
      }

      await this.prisma.variantAttributeValue.create({ data: { variantId, optionId: option.id } });
    }
  }
}
