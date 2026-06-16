import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { BffController } from "./bff.controller";
import { BffService } from "./bff.service";

@Module({
  imports: [HttpModule],
  controllers: [BffController],
  providers: [BffService],
})
export class BffModule {}
