import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { UsersService } from '@/modules/users/users.service';
import { validatePasswordStrength } from '@/common/utils/password.util';
import { RegisterDto, LoginDto, AuthResponseDto, RefreshTokenDto } from './dto';
import { JwtPayload } from '@/common/types/jwt-payload.interface';

const MAX_REFRESH_TOKENS = 5;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    if (!validatePasswordStrength(registerDto.password)) {
      throw new BadRequestException('Password must contain uppercase, lowercase, and numbers');
    }

    const user = await this.usersService.create(registerDto);
    return this.generateAuthResponse(user.id, user.email);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      this.logger.warn(`Failed login attempt for email: ${loginDto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    return this.generateAuthResponse(user.id, user.email);
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshTokenDto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      await this.validateRefreshToken(payload.sub, refreshTokenDto.refreshToken);
      const user = await this.usersService.findById(payload.sub);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      await this.revokeRefreshToken(refreshTokenDto.refreshToken);
      return this.generateAuthResponse(user.id, user.email);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Refresh token validation failed: ${message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.revokeRefreshToken(refreshToken);
    this.logger.log(`User ${userId} logged out`);
  }

  private generateAccessToken(userId: string, email: string): string {
    const payload = {
      sub: userId,
      email,
      type: 'access',
    } as const;

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
  }

  private generateRefreshToken(userId: string, email: string): string {
    const payload = {
      sub: userId,
      email,
      type: 'refresh',
    } as const;

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });
  }

  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    const existingTokens = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (existingTokens.length >= MAX_REFRESH_TOKENS) {
      const oldestToken = existingTokens[existingTokens.length - 1];
      await this.prisma.refreshToken.delete({ where: { id: oldestToken.id } });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  }

  private async validateRefreshToken(userId: string, token: string): Promise<void> {
    const refreshToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        token,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!refreshToken) {
      throw new BadRequestException('Invalid or expired refresh token');
    }
  }

  private async revokeRefreshToken(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  private async generateAuthResponse(userId: string, email: string): Promise<AuthResponseDto> {
    const accessToken = this.generateAccessToken(userId, email);
    const refreshToken = this.generateRefreshToken(userId, email);

    await this.storeRefreshToken(userId, refreshToken);
    const user = await this.usersService.getUserProfile(userId);

    return {
      accessToken,
      refreshToken,
      user,
    };
  }
}
