import { Module } from "@nestjs/common";
import { SearchService } from "./search.service";
import { SearchController } from "./search.controller";
import { SearchGrpcController } from "./search-grpc.controller";
import { CdcConsumer } from "./consumers/cdc.consumer";

@Module({
  controllers: [SearchController, SearchGrpcController],
  providers: [SearchService, CdcConsumer],
})
export class SearchModule {}
