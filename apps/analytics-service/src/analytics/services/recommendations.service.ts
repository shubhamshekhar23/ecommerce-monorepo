import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import type { CoPurchasePair } from "./clickhouse.service";

const KEY = (productId: string): string => `recs:product:${productId}`;
const TOP_N = 5;

export interface Recommendation {
  productId: string;
  score: number;
}

@Injectable()
export class RecommendationsService implements OnModuleInit, OnModuleDestroy {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
  }

  async onModuleInit(): Promise<void> {
    await this.redis.ping();
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async bulkSetScores(pairs: CoPurchasePair[]): Promise<void> {
    if (pairs.length === 0) return;
    const pipeline = this.redis.pipeline();
    for (const { productA, productB, score } of pairs) {
      pipeline.zadd(KEY(productA), score, productB);
      pipeline.zadd(KEY(productB), score, productA);
    }
    await pipeline.exec();
  }

  async getTopN(productId: string): Promise<Recommendation[]> {
    const raw = await this.redis.zrevrange(
      KEY(productId),
      0,
      TOP_N - 1,
      "WITHSCORES",
    );
    const results: Recommendation[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      results.push({ productId: raw[i], score: Number(raw[i + 1]) });
    }
    return results;
  }
}
