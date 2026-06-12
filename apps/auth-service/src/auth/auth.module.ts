import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { RabbitMQModule } from '../queue/rabbitmq.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TotpService } from './totp.service';
import { AuditService } from './audit.service';
import { PasswordResetService } from './password-reset.service';
import { JwksController } from './jwks.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        publicKey: config.get<string>('jwt.publicKey'),
        signOptions: { algorithm: 'RS256' },
      }),
    }),
    RabbitMQModule,
    PrismaModule,
    MailModule,
    RateLimitModule,
  ],
  controllers: [AuthController, JwksController],
  providers: [
    AuthService,
    TotpService,
    AuditService,
    PasswordResetService,
    JwtStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
  ],
})
export class AuthModule {}
