import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '@/modules/prisma/prisma.service';
import * as passwordUtil from '@/common/utils/password.util';
import { UserRole } from '@prisma/client';

jest.mock('@/common/utils/password.util');

// eslint-disable-next-line max-lines-per-function
describe('UsersService', () => {
  let service: UsersService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: '123',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
    isActive: true,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const createDto = {
        email: 'new@example.com',
        password: 'SecurePass123',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      (passwordUtil.hashPassword as jest.Mock).mockResolvedValue('hashedPassword');
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.create(createDto);

      expect(result.email).toBe(mockUser.email);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: createDto.email,
          password: 'hashedPassword',
          firstName: createDto.firstName,
          lastName: createDto.lastName,
        },
      });
    });

    it('should throw ConflictException if email exists', async () => {
      const createDto = {
        email: 'test@example.com',
        password: 'SecurePass123',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('validateUser', () => {
    it('should validate user with correct password', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (passwordUtil.comparePassword as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'SecurePass123');

      expect(result).toEqual(mockUser);
    });

    it('should return null if password is incorrect', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (passwordUtil.comparePassword as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'WrongPassword');

      expect(result).toBeNull();
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile without password', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserProfile('123');

      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(Object.keys(result)).not.toContain('password');
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserProfile('999')).rejects.toThrow(NotFoundException);
    });
  });
});
