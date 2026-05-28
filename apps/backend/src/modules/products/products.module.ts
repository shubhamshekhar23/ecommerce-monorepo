import { Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { OutboxModule } from '@/modules/outbox/outbox.module';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { VariantsService } from './variants/variants.service';
import { VariantsController } from './variants/variants.controller';
import { CsvImportService } from './csv-import.service';

@Module({
  imports: [PrismaModule, OutboxModule],
  controllers: [ProductsController, VariantsController],
  providers: [ProductsService, VariantsService, CsvImportService],
  exports: [ProductsService, VariantsService],
})
export class ProductsModule {}
