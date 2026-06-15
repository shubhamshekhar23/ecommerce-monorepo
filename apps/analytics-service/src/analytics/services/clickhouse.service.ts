import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { createClient, ClickHouseClient } from "@clickhouse/client";

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS order_items (
    order_id  String,
    user_id   String,
    product_id String,
    quantity  UInt32,
    price     Float64,
    placed_at DateTime('UTC')
  ) ENGINE = MergeTree()
  ORDER BY (placed_at, order_id)
`;

const CO_PURCHASE_SQL = `
  SELECT
    a.product_id AS product_a,
    b.product_id AS product_b,
    count()       AS co_count
  FROM order_items a
  INNER JOIN order_items b
    ON  a.order_id   = b.order_id
    AND a.product_id < b.product_id
  GROUP BY product_a, product_b
  HAVING co_count >= 1
  ORDER BY co_count DESC
  LIMIT 50000
`;

export interface OrderItemRow {
  order_id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  price: number;
  placed_at: string;
}

interface CoPurchaseRow {
  product_a: string;
  product_b: string;
  co_count: string;
}

export interface CoPurchasePair {
  productA: string;
  productB: string;
  score: number;
}

@Injectable()
export class ClickhouseService implements OnModuleInit {
  private readonly logger = new Logger(ClickhouseService.name);
  private readonly client: ClickHouseClient;

  constructor() {
    this.client = createClient({
      url: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.command({ query: CREATE_TABLE_SQL });
    this.logger.log("ClickHouse order_items table ready");
  }

  async insertOrderItems(rows: OrderItemRow[]): Promise<void> {
    if (rows.length === 0) return;
    await this.client.insert({
      table: "order_items",
      values: rows,
      format: "JSONEachRow",
    });
  }

  async getCoPurchasePairs(): Promise<CoPurchasePair[]> {
    const result = await this.client.query({
      query: CO_PURCHASE_SQL,
      format: "JSONEachRow",
    });
    const rows = await result.json<CoPurchaseRow>();
    return rows.map((r) => ({
      productA: r.product_a,
      productB: r.product_b,
      score: Number(r.co_count),
    }));
  }
}
