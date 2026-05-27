import { Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { VariantsService } from './variants/variants.service';
import { VariantsController } from './variants/variants.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController, VariantsController],
  providers: [ProductsService, VariantsService],
  exports: [ProductsService, VariantsService],
})
export class ProductsModule {}
