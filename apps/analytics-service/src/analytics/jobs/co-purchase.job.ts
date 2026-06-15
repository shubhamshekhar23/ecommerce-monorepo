import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ClickhouseService } from "../services/clickhouse.service";
import { RecommendationsService } from "../services/recommendations.service";

@Injectable()
export class CoPurchaseJob {
  private readonly logger = new Logger(CoPurchaseJob.name);

  constructor(
    private readonly clickhouse: ClickhouseService,
    private readonly recommendations: RecommendationsService,
  ) {}

  // Recomputes co-purchase scores from ClickHouse and refreshes Redis every 5 minutes.
  @Cron("0 */5 * * * *")
  async run(): Promise<void> {
    this.logger.log("Co-purchase job starting");
    const pairs = await this.clickhouse.getCoPurchasePairs();
    await this.recommendations.bulkSetScores(pairs);
    this.logger.log(`Co-purchase job done: ${pairs.length} pairs updated`);
  }
}
