import { Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { OutboxModule } from '@/modules/outbox/outbox.module';
import { ReviewsModule } from '@/modules/reviews/reviews.module';
import { SearchGrpcClientModule } from '@/modules/search/search-grpc-client.module';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { VariantsService } from './variants/variants.service';
import { VariantsController } from './variants/variants.controller';
import { CsvImportService } from './csv-import.service';
import { ProductsResolver } from './products.resolver';
import { InventoryGateway } from './inventory.gateway';

@Module({
  imports: [PrismaModule, OutboxModule, ReviewsModule, SearchGrpcClientModule],
  controllers: [ProductsController, VariantsController],
  providers: [
    ProductsService,
    VariantsService,
    CsvImportService,
    ProductsResolver,
    InventoryGateway,
  ],
  exports: [ProductsService, VariantsService],
})
export class ProductsModule {}
