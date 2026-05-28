import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { UsersService } from '@/modules/users/users.service';
import { AuditService } from '@/modules/audit/audit.service';
import { EXCHANGES, ROUTING_KEYS } from '@ecommerce/shared-types';
import type { UserRegisteredEvent } from '@ecommerce/shared-types';
import { TotpService } from './totp.service';
import { validatePasswordStrength } from '@/common/utils/password.util';
import { RegisterDto, LoginDto, AuthResponseDto, RefreshTokenDto } from './dto';
import { TwoFactorVerifyDto } from './dto/two-factor-verify.dto';
import { JwtPayload } from '@/common/types/jwt-payload.interface';

const MAX_REFRESH_TOKENS = 5;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const TWO_FACTOR_PENDING_EXPIRY = '5m';

export interface TwoFactorRequiredResponse {
  twoFactorRequired: true;
  twoFactorToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');
  private readonly privateKey: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly amqp: AmqpConnection,
    private readonly auditService: AuditService,
    private readonly totpService: TotpService,
  ) {
    // Unescape \n so PEM stored as a single env-var line works correctly.
    this.privateKey = (configService.get<string>('JWT_PRIVATE_KEY') ?? '').replace(/\\n/g, '\n');
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    if (!validatePasswordStrength(registerDto.password)) {
      throw new BadRequestException('Password must contain uppercase, lowercase, and numbers');
    }

    const user = await this.usersService.create(registerDto);

    const event: UserRegisteredEvent = {
      userId: user.id,
      email: user.email,
      firstName: user.firstName ?? '',
    };
    await this.amqp.publish(EXCHANGES.USER, ROUTING_KEYS.USER.REGISTERED, event);

    return this.generateAuthResponse(user.id, user.email);
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponseDto | TwoFactorRequiredResponse> {
    const user = await this.usersService.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      this.logger.warn(`Failed login attempt for email: ${loginDto.email}`);
      await this.auditService.log({
        action: 'USER_LOGIN_FAILED',
        userEmail: loginDto.email,
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // If 2FA is enabled, issue a short-lived pending token instead of full tokens.
    // The client must POST /auth/2fa/verify with this token + OTP to get real tokens.
    if (user.totpEnabled) {
      const pendingPayload: Pick<JwtPayload, 'sub' | 'email' | 'type'> = {
        sub: user.id, email: user.email, type: '2fa_pending',
      };
      const pendingToken = this.jwtService.sign(
        pendingPayload,
        { privateKey: this.privateKey, algorithm: 'RS256', expiresIn: TWO_FACTOR_PENDING_EXPIRY },
      );
      return { twoFactorRequired: true, twoFactorToken: pendingToken };
    }

    await this.auditService.log({
      action: 'USER_LOGIN_SUCCESS',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      ipAddress,
      userAgent,
    });

    return this.generateAuthResponse(user.id, user.email);
  }

  async verifyTwoFactor(dto: TwoFactorVerifyDto, ipAddress?: string, userAgent?: string): Promise<AuthResponseDto> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(dto.twoFactorToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired 2FA token');
    }

    if (payload.type !== '2fa_pending') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive || !user.totpEnabled || !user.totpSecret) {
      throw new UnauthorizedException('2FA not configured');
    }

    if (!this.totpService.verify(dto.code, user.totpSecret)) {
      await this.auditService.log({
        action: 'USER_2FA_VERIFY_FAILED',
        userId: user.id,
        userEmail: user.email,
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.auditService.log({
      action: 'USER_LOGIN_SUCCESS',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      ipAddress,
      userAgent,
    });

    return this.generateAuthResponse(user.id, user.email);
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshTokenDto.refreshToken);
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

  // ── Google OAuth ─────────────────────────────────────────────────────────────

  async handleOAuthLogin(
    provider: 'GOOGLE',
    providerUserId: string,
    email: string,
    firstName?: string,
    lastName?: string,
  ): Promise<AuthResponseDto> {
    // Find existing OAuth link, or link/create a user account.
    let oauthAccount = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
      include: { user: true },
    });

    if (!oauthAccount) {
      // Try to link to an existing user with the same email, else create a new one.
      let user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email,
            password: '',
            firstName: firstName ?? null,
            lastName: lastName ?? null,
            emailVerified: true,
          },
        });
      }

      oauthAccount = await this.prisma.oAuthAccount.create({
        data: { userId: user.id, provider, providerUserId },
        include: { user: true },
      });
    }

    return this.generateAuthResponse(oauthAccount.user.id, oauthAccount.user.email);
  }

  // ── TOTP 2FA management ──────────────────────────────────────────────────────

  async setupTotp(userId: string): Promise<{ secret: string; uri: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const { secret, uri } = this.totpService.generateSecret(user.email);

    // Store the secret un-enabled — user must confirm with a valid OTP to activate.
    await this.prisma.user.update({ where: { id: userId }, data: { totpSecret: secret } });

    return { secret, uri };
  }

  async enableTotp(userId: string, code: string, ipAddress?: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user?.totpSecret) throw new BadRequestException('Call /auth/2fa/setup first');
    if (user.totpEnabled) throw new BadRequestException('2FA is already enabled');

    if (!this.totpService.verify(code, user.totpSecret)) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } });
    await this.auditService.log({ action: 'USER_2FA_ENABLED', userId, userEmail: user.email, ipAddress });
  }

  async disableTotp(userId: string, code: string, ipAddress?: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user?.totpEnabled || !user.totpSecret) throw new BadRequestException('2FA is not enabled');

    if (!this.totpService.verify(code, user.totpSecret)) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: false, totpSecret: null },
    });
    await this.auditService.log({ action: 'USER_2FA_DISABLED', userId, userEmail: user.email, ipAddress });
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private sign(payload: object, expiresIn: string): string {
    return this.jwtService.sign(payload, {
      privateKey: this.privateKey,
      algorithm: 'RS256',
      expiresIn,
    });
  }

  private generateAccessToken(userId: string, email: string): string {
    return this.sign({ sub: userId, email, type: 'access' }, ACCESS_TOKEN_EXPIRY);
  }

  private generateRefreshToken(userId: string, email: string): string {
    return this.sign({ sub: userId, email, type: 'refresh' }, REFRESH_TOKEN_EXPIRY);
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
    await this.prisma.refreshToken.create({ data: { userId, token, expiresAt } });
  }

  private async validateRefreshToken(userId: string, token: string): Promise<void> {
    const refreshToken = await this.prisma.refreshToken.findFirst({
      where: { userId, token, revokedAt: null, expiresAt: { gt: new Date() } },
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

    return { accessToken, refreshToken, user };
  }
}
