import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PrismaService } from '@/modules/prisma/prisma.service';

// eslint-disable-next-line max-lines-per-function
describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: jest.Mocked<PrismaService>;

  const mockCategory = {
    id: 'cat_1',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices',
    image: null,
    parentId: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: {
            category: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  describe('create', () => {
    it('should create a root category', async () => {
      prisma.category.findFirst.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue(mockCategory);

      const result = await service.create({
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices',
      });

      expect(result.id).toBe('cat_1');
      expect(result.name).toBe('Electronics');
    });

    it('should throw ConflictException on duplicate slug', async () => {
      prisma.category.findFirst.mockResolvedValue(mockCategory);

      await expect(
        service.create({
          name: 'Electronics',
          slug: 'electronics',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException on invalid parent', async () => {
      prisma.category.findFirst.mockResolvedValue(null);
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          name: 'Phones',
          slug: 'phones',
          parentId: 'invalid_id',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('should return category by id', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findById('cat_1');

      expect(result.id).toBe('cat_1');
      expect(result.name).toBe('Electronics');
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findById('invalid_id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update category without changing parent', async () => {
      const updated = { ...mockCategory, name: 'Tech' };
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      prisma.category.update.mockResolvedValue(updated);

      const result = await service.update('cat_1', { name: 'Tech' });

      expect(result.name).toBe('Tech');
    });

    it('should throw on circular reference', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce({ parentId: 'cat_1' });

      await expect(service.update('cat_1', { parentId: 'cat_2' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('softDelete', () => {
    it('should set isActive to false', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      prisma.category.update.mockResolvedValue({ ...mockCategory, isActive: false });

      await service.softDelete('cat_1');

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat_1' },
        data: { isActive: false },
      });
    });
  });
});
