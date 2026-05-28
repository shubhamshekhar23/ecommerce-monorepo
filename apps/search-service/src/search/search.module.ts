import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { ProductConsumer } from './consumers/product.consumer';

@Module({
  controllers: [SearchController],
  providers: [SearchService, ProductConsumer],
})
export class SearchModule {}
