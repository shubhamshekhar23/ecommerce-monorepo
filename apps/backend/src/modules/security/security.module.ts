import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from '@/modules/users/users.module';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

/*
 - JWT verification only — no signing.
 - The auth-service holds the private key and issues tokens.
 - This module lets the backend verify those tokens via the RS256 public key.
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        publicKey: config.get<string>('JWT_PUBLIC_KEY')?.replace(/\\n/g, '\n'),
        signOptions: { algorithm: 'RS256' },
      }),
    }),
    UsersModule,
    PrismaModule,
  ],
  providers: [JwtStrategy, JwtRefreshStrategy],
})
export class SecurityModule {}
