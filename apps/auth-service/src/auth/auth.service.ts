import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { EXCHANGES, ROUTING_KEYS } from '@ecommerce/shared-types';
import type { UserRegisteredEvent } from '@ecommerce/shared-types';
import { RabbitMQService } from '../queue/rabbitmq.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import { TotpService } from './totp.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TwoFactorVerifyDto } from './dto/two-factor-verify.dto';
import { JwtPayload } from '../common/types/jwt-payload.interface';

const SALT_ROUNDS = 12;
const MAX_REFRESH_TOKENS = 5;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const TWO_FACTOR_PENDING_EXPIRY = '5m';

export interface TwoFactorRequiredResponse {
  twoFactorRequired: true;
  twoFactorToken: string;
}

function validatePasswordStrength(password: string): boolean {
  return /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly privateKey: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly amqp: RabbitMQService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly totpService: TotpService,
  ) {
    this.privateKey = (config.get<string>('jwt.privateKey') ?? '').replace(/\\n/g, '\n');
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    if (!validatePasswordStrength(dto.password)) {
      throw new BadRequestException('Password must contain uppercase, lowercase, and numbers');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hashed, firstName: dto.firstName, lastName: dto.lastName },
    });

    const event: UserRegisteredEvent = { userId: user.id, email: user.email, firstName: user.firstName ?? '' };
    this.amqp.publish(EXCHANGES.USER, ROUTING_KEYS.USER.REGISTERED, event);
    this.logger.log(`User registered: ${user.email}`);

    return this.buildAuthResponse(user.id, user.email, user.firstName, user.lastName);
  }

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto | TwoFactorRequiredResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    const valid = user && (await bcrypt.compare(dto.password, user.password));
    if (!valid || !user) {
      await this.auditService.log({ action: 'USER_LOGIN_FAILED', userEmail: dto.email, ipAddress, userAgent });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) throw new UnauthorizedException('User account is inactive');

    // If 2FA is enabled, issue a short-lived pending token instead of full tokens.
    // The client must POST /auth/2fa/verify with this token + OTP to get real tokens.
    if (user.totpEnabled) {
      const pendingToken = this.sign(
        { sub: user.id, email: user.email, type: '2fa_pending' },
        TWO_FACTOR_PENDING_EXPIRY,
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

    return this.buildAuthResponse(user.id, user.email, user.firstName, user.lastName);
  }

  async verifyTwoFactor(
    dto: TwoFactorVerifyDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(dto.twoFactorToken, {
        algorithms: ['RS256'],
        secret: undefined,
        publicKey: (this.config.get<string>('jwt.publicKey') ?? '').replace(/\\n/g, '\n'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired 2FA token');
    }

    if (payload.type !== '2fa_pending') throw new UnauthorizedException('Invalid token type');

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
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

    return this.buildAuthResponse(user.id, user.email, user.firstName, user.lastName);
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const stored = await this.prisma.refreshToken.findFirst({
      where: { token: dto.refreshToken, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!stored || !stored.user.isActive) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.buildAuthResponse(stored.user.id, stored.user.email, stored.user.firstName, stored.user.lastName);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revokedAt: new Date() },
    });
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
    let oauthAccount = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
      include: { user: true },
    });

    if (!oauthAccount) {
      let user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        user = await this.prisma.user.create({
          data: { email, password: '', firstName: firstName ?? null, lastName: lastName ?? null, emailVerified: true },
        });
      }

      oauthAccount = await this.prisma.oAuthAccount.create({
        data: { userId: user.id, provider, providerUserId },
        include: { user: true },
      });
    }

    return this.buildAuthResponse(
      oauthAccount.user.id,
      oauthAccount.user.email,
      oauthAccount.user.firstName,
      oauthAccount.user.lastName,
    );
  }

  // ── TOTP 2FA management ──────────────────────────────────────────────────────

  async setupTotp(userId: string): Promise<{ secret: string; uri: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const { secret, uri } = this.totpService.generateSecret(user.email);
    await this.prisma.user.update({ where: { id: userId }, data: { totpSecret: secret } });
    return { secret, uri };
  }

  async enableTotp(userId: string, code: string, ipAddress?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret) throw new BadRequestException('Call /auth/2fa/setup first');
    if (user.totpEnabled) throw new BadRequestException('2FA is already enabled');

    if (!this.totpService.verify(code, user.totpSecret)) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } });
    await this.auditService.log({ action: 'USER_2FA_ENABLED', userId, userEmail: user.email, ipAddress });
  }

  async disableTotp(userId: string, code: string, ipAddress?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
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
    return this.jwtService.sign(payload, { privateKey: this.privateKey, algorithm: 'RS256', expiresIn });
  }

  private async buildAuthResponse(
    userId: string,
    email: string,
    firstName: string | null,
    lastName: string | null,
  ): Promise<AuthResponseDto> {
    const accessToken = this.sign({ sub: userId, email, type: 'access' }, ACCESS_TOKEN_EXPIRY);
    const refreshToken = this.sign({ sub: userId, email, type: 'refresh', jti: uuidv4() }, REFRESH_TOKEN_EXPIRY);

    await this.pruneOldRefreshTokens(userId);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.prisma.refreshToken.create({ data: { userId, token: refreshToken, expiresAt } });

    return { accessToken, refreshToken, user: { id: userId, email, firstName, lastName } };
  }

  private async pruneOldRefreshTokens(userId: string): Promise<void> {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (tokens.length >= MAX_REFRESH_TOKENS) {
      const oldest = tokens[tokens.length - 1];
      await this.prisma.refreshToken.delete({ where: { id: oldest.id } });
    }
  }
}
