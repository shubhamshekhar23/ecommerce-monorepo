import { Module } from "@nestjs/common";
import { OrderConsumer } from "./consumers/order.consumer";
import { ClickhouseService } from "./services/clickhouse.service";
import { RecommendationsService } from "./services/recommendations.service";
import { CoPurchaseJob } from "./jobs/co-purchase.job";
import { RecommendationsController } from "./controllers/recommendations.controller";

@Module({
  controllers: [RecommendationsController],
  providers: [
    OrderConsumer,
    ClickhouseService,
    RecommendationsService,
    CoPurchaseJob,
  ],
})
export class AnalyticsModule {}
