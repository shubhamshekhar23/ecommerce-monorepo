import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { HealthController } from "./health/health.controller";
import { BffModule } from "./bff/bff.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    BffModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
