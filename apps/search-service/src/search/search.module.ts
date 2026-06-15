import { Module } from "@nestjs/common";
import { SearchService } from "./search.service";
import { SearchController } from "./search.controller";
import { CdcConsumer } from "./consumers/cdc.consumer";

@Module({
  controllers: [SearchController],
  providers: [SearchService, CdcConsumer],
})
export class SearchModule {}
