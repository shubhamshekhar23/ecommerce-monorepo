import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto, CategoryTreeDto } from './dto';
import { calculatePagination, buildPaginationResponse } from '@/common/utils/pagination.util';
import { PaginationDto } from '@/common/types/pagination.interface';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const { parentId } = createCategoryDto;

    if (parentId) {
      await this.validateParentExists(parentId);
    }

    const existing = await this.prisma.category.findFirst({
      where: {
        OR: [{ slug: createCategoryDto.slug }, { name: createCategoryDto.name }],
      },
    });

    if (existing) {
      throw new ConflictException('Category name or slug already exists');
    }

    const category = await this.prisma.category.create({
      data: createCategoryDto,
    });

    return this.mapToResponseDto(category);
  }

  async findAll(page = 1, limit = 20): Promise<PaginationDto<CategoryResponseDto>> {
    const { skip, take } = calculatePagination(page, limit);

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where: { isActive: true },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.category.count({ where: { isActive: true } }),
    ]);

    return buildPaginationResponse(
      categories.map((c) => this.mapToResponseDto(c)),
      total,
      page,
      limit,
    );
  }

  async findById(id: string): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return this.mapToResponseDto(category);
  }

  async findBySlug(slug: string): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) {
      throw new NotFoundException(`Category with slug ${slug} not found`);
    }

    return this.mapToResponseDto(category);
  }

  async getTree(): Promise<CategoryTreeDto[]> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true, parentId: null },
      include: { children: { where: { isActive: true }, include: { children: true } } },
      orderBy: { name: 'asc' },
    });

    return categories.map((c) => this.buildTreeNode(c));
  }

  // eslint-disable-next-line max-lines-per-function
  async findChildren(
    parentId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginationDto<CategoryResponseDto>> {
    const { skip, take } = calculatePagination(page, limit);

    const [children, total] = await Promise.all([
      this.prisma.category.findMany({
        where: { parentId, isActive: true },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.category.count({ where: { parentId, isActive: true } }),
    ]);

    return buildPaginationResponse(
      children.map((c) => this.mapToResponseDto(c)),
      total,
      page,
      limit,
    );
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (updateCategoryDto.slug || updateCategoryDto.name) {
      const orConditions = [
        ...(updateCategoryDto.slug ? [{ slug: updateCategoryDto.slug }] : []),
        ...(updateCategoryDto.name ? [{ name: updateCategoryDto.name }] : []),
      ];
      const conflict = await this.prisma.category.findFirst({
        where: { AND: [{ id: { not: id } }, { OR: orConditions }] },
      });
      if (conflict) {
        throw new ConflictException('Category name or slug already exists');
      }
    }

    if (updateCategoryDto.parentId) {
      if (updateCategoryDto.parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }
      await this.validateNoCircularReference(id, updateCategoryDto.parentId);
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });

    return this.mapToResponseDto(updated);
  }

  async softDelete(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    await this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async validateParentExists(parentId: string): Promise<void> {
    const parent = await this.prisma.category.findUnique({ where: { id: parentId } });
    if (!parent || !parent.isActive) {
      throw new BadRequestException(`Parent category ${parentId} does not exist or is inactive`);
    }
  }

  private async validateNoCircularReference(categoryId: string, parentId: string): Promise<void> {
    let current = await this.prisma.category.findUnique({
      where: { id: parentId },
      select: { parentId: true },
    });

    while (current?.parentId) {
      if (current.parentId === categoryId) {
        throw new BadRequestException('Circular reference detected in category hierarchy');
      }

      current = await this.prisma.category.findUnique({
        where: { id: current.parentId },
        select: { parentId: true },
      });
    }
  }

  private mapToResponseDto(category: any): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image,
      parentId: category.parentId,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  private buildTreeNode(category: any): CategoryTreeDto {
    const node = new CategoryTreeDto();
    Object.assign(node, this.mapToResponseDto(category));
    node.children = (category.children || []).map((child: any) => this.buildTreeNode(child));

    return node;
  }
}
