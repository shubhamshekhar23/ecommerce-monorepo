import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { UsersModule } from '@/modules/users/users.module';
import { MailModule } from '@/modules/mail/mail.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwksController } from './jwks.controller';
import { JwtStrategy, JwtRefreshStrategy } from './strategies';
import { GoogleStrategy } from './strategies/google.strategy';
import { TotpService } from './totp.service';

// JwtModule is configured with the RS256 public key as the default verify key.
// Individual sign calls pass privateKey explicitly (see auth.service.ts).
// The module-level publicKey is used by passport-jwt strategies for verification.
@Module({
  imports: [
    PrismaModule,
    UsersModule,
    MailModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        publicKey: configService.get<string>('JWT_PUBLIC_KEY')?.replace(/\\n/g, '\n'),
        signOptions: { algorithm: 'RS256' },
      }),
    }),
  ],
  controllers: [AuthController, JwksController],
  providers: [AuthService, TotpService, JwtStrategy, JwtRefreshStrategy, GoogleStrategy],
  exports: [AuthService, TotpService],
})
export class AuthModule {}
