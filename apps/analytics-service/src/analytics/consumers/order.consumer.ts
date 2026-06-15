import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { Kafka, Consumer, EachMessagePayload } from "kafkajs";
import type { AnalyticsOrderEvent } from "@ecommerce/shared-types";
import {
  ClickhouseService,
  OrderItemRow,
} from "../services/clickhouse.service";

const TOPIC = "order.placed";

@Injectable()
export class OrderConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderConsumer.name);
  private readonly consumer: Consumer;

  constructor(private readonly clickhouse: ClickhouseService) {
    const kafka = new Kafka({
      clientId: "analytics-service",
      brokers: (process.env.KAFKA_BROKERS ?? "redpanda:9092").split(","),
      retry: { retries: 10 },
    });
    this.consumer = kafka.consumer({ groupId: "analytics-service-orders" });
  }

  async onModuleInit(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: TOPIC, fromBeginning: true });
    void this.consumer.run({ eachMessage: (p) => this.handleMessage(p) });
    this.logger.log(`Order consumer started — listening on ${TOPIC}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer.disconnect();
  }

  private async handleMessage({ message }: EachMessagePayload): Promise<void> {
    if (!message.value) return;
    const event = JSON.parse(message.value.toString()) as AnalyticsOrderEvent;
    const placedAt = new Date(event.placedAt)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);
    const rows: OrderItemRow[] = event.items.map((item) => ({
      order_id: event.orderId,
      user_id: event.userId,
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
      placed_at: placedAt,
    }));
    await this.clickhouse.insertOrderItems(rows);
    this.logger.debug(
      `Inserted ${rows.length} order items for order ${event.orderId}`,
    );
  }
}
