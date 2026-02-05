import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '@/modules/users/users.service';
import { PrismaService } from '@/modules/prisma/prisma.service';
import * as passwordUtil from '@/common/utils/password.util';
import { UserRole } from '@prisma/client';

jest.mock('@/common/utils/password.util');

// eslint-disable-next-line max-lines-per-function
describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: '123',
    email: 'test@example.com',
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
        AuthService,
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            validateUser: jest.fn(),
            getUserProfile: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            refreshToken: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;

    configService.get.mockReturnValue('secret-key');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a user successfully', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'SecurePass123',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      (passwordUtil.validatePasswordStrength as jest.Mock).mockReturnValue(true);
      usersService.create.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('token');
      prismaService.refreshToken.findMany.mockResolvedValue([]);
      usersService.getUserProfile.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toEqual(mockUser);
    });

    it('should throw BadRequestException for weak password', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'weak',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      (passwordUtil.validatePasswordStrength as jest.Mock).mockReturnValue(false);

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'SecurePass123',
      };

      usersService.validateUser.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('token');
      prismaService.refreshToken.findMany.mockResolvedValue([]);
      usersService.getUserProfile.mockResolvedValue(mockUser);

      const result = await service.login(loginDto);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toEqual(mockUser);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      usersService.validateUser.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'SecurePass123',
      };

      const inactiveUser = { ...mockUser, isActive: false };
      usersService.validateUser.mockResolvedValue(inactiveUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      const refreshTokenDto = { refreshToken: 'valid-refresh-token' };
      const payload = {
        sub: '123',
        email: 'test@example.com',
        role: UserRole.USER,
        type: 'refresh',
      };

      jwtService.verify.mockReturnValue(payload);
      prismaService.refreshToken.findFirst.mockResolvedValue({
        id: '1',
        userId: '123',
        token: 'valid-refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        revokedAt: null,
      });
      usersService.findById.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('new-token');
      prismaService.refreshToken.findMany.mockResolvedValue([]);
      usersService.getUserProfile.mockResolvedValue(mockUser);

      const result = await service.refresh(refreshTokenDto);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const refreshTokenDto = { refreshToken: 'invalid-token' };

      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refresh(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke refresh token on logout', async () => {
      const userId = '123';
      const refreshToken = 'some-token';

      prismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout(userId, refreshToken);

      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token: refreshToken },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
