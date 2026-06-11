import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { LoggerModule } from './logger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    LoggerModule,
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
