import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { EXCHANGES, ROUTING_KEYS } from '@ecommerce/shared-types';
import type { UserRegisteredEvent } from '@ecommerce/shared-types';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

const SALT_ROUNDS = 12;
const MAX_REFRESH_TOKENS = 5;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly prisma = new PrismaClient();
  private readonly privateKey: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly amqp: AmqpConnection,
  ) {
    this.privateKey = config.get<string>('jwt.privateKey') ?? '';
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    if (dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hashed, firstName: dto.firstName, lastName: dto.lastName },
    });

    const event: UserRegisteredEvent = { userId: user.id, email: user.email, firstName: user.firstName ?? '' };
    await this.amqp.publish(EXCHANGES.USER, ROUTING_KEYS.USER.REGISTERED, event);
    this.logger.log(`User registered: ${user.email}`);

    return this.buildAuthResponse(user.id, user.email, user.firstName, user.lastName);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    this.logger.log(`User logged in: ${user.email}`);
    return this.buildAuthResponse(user.id, user.email, user.firstName, user.lastName);
  }

  async refresh(token: string): Promise<AuthResponseDto> {
    const stored = await this.prisma.refreshToken.findFirst({
      where: { token, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!stored || !stored.user.isActive) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.buildAuthResponse(stored.user.id, stored.user.email, stored.user.firstName, stored.user.lastName);
  }

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
    const refreshToken = this.sign({ sub: userId, email, type: 'refresh' }, REFRESH_TOKEN_EXPIRY);

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
