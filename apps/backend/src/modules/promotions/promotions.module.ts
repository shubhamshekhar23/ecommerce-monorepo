import { Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { RulesEngineService } from './rules-engine.service';
import { PromotionsController } from './promotions.controller';

@Module({
  imports: [PrismaModule],
  providers: [RulesEngineService],
  controllers: [PromotionsController],
  exports: [RulesEngineService],
})
export class PromotionsModule {}
