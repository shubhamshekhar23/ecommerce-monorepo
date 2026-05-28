import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '@/modules/users/users.service';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { TotpService } from './totp.service';
import { MailService } from '@/modules/mail/mail.service';
import * as passwordUtil from '@/common/utils/password.util';

jest.mock('@/common/utils/password.util');

// eslint-disable-next-line max-lines-per-function
describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: '123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'USER',
    isActive: true,
    totpEnabled: false,
    totpSecret: null,
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
            sign: jest.fn().mockReturnValue('mock-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'JWT_PRIVATE_KEY') return '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';
              return 'mock-value';
            }),
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
            oAuthAccount: { findUnique: jest.fn(), create: jest.fn() },
            user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
          },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: TotpService,
          useValue: { generateSecret: jest.fn(), verify: jest.fn() },
        },
        {
          provide: MailService,
          useValue: { sendWelcomeEmail: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
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
      usersService.create.mockResolvedValue(mockUser as any);
      prismaService.refreshToken.findMany.mockResolvedValue([]);
      usersService.getUserProfile.mockResolvedValue(mockUser as any);

      const result = await service.register(registerDto);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toEqual(mockUser);
    });

    it('should throw BadRequestException for weak password', async () => {
      (passwordUtil.validatePasswordStrength as jest.Mock).mockReturnValue(false);

      await expect(
        service.register({ email: 'new@example.com', password: 'weak', firstName: 'J', lastName: 'S' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should login user successfully when 2FA is disabled', async () => {
      usersService.validateUser.mockResolvedValue(mockUser as any);
      prismaService.refreshToken.findMany.mockResolvedValue([]);
      usersService.getUserProfile.mockResolvedValue(mockUser as any);

      const result = await service.login({ email: 'test@example.com', password: 'SecurePass123' });

      expect((result as any).accessToken).toBeDefined();
    });

    it('should return twoFactorRequired when 2FA is enabled', async () => {
      usersService.validateUser.mockResolvedValue({ ...mockUser, totpEnabled: true } as any);

      const result = await service.login({ email: 'test@example.com', password: 'SecurePass123' });

      expect((result as any).twoFactorRequired).toBe(true);
      expect((result as any).twoFactorToken).toBeDefined();
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      usersService.validateUser.mockResolvedValue(null);

      await expect(
        service.login({ email: 'test@example.com', password: 'Wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      usersService.validateUser.mockResolvedValue({ ...mockUser, isActive: false } as any);

      await expect(
        service.login({ email: 'test@example.com', password: 'SecurePass123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      const payload = { sub: '123', email: 'test@example.com', role: 'USER', type: 'refresh' };

      jwtService.verify.mockReturnValue(payload);
      prismaService.refreshToken.findFirst.mockResolvedValue({
        id: '1', userId: '123', token: 'valid-refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(), revokedAt: null,
      });
      usersService.findById.mockResolvedValue(mockUser as any);
      prismaService.refreshToken.findMany.mockResolvedValue([]);
      usersService.getUserProfile.mockResolvedValue(mockUser as any);

      const result = await service.refresh({ refreshToken: 'valid-refresh-token' });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('Invalid token'); });

      await expect(service.refresh({ refreshToken: 'invalid' })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke refresh token on logout', async () => {
      prismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout('123', 'some-token');

      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token: 'some-token' },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
