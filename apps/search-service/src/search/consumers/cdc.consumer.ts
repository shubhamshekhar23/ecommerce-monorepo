import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { Kafka, Consumer, EachMessagePayload } from "kafkajs";
import { SearchService } from "../search.service";

// Debezium CDC envelope — op values: c=create, u=update, d=delete, r=read (snapshot)
interface DebeziumMessage {
  op: "c" | "u" | "d" | "r";
  before: ProductRow | null;
  after: ProductRow | null;
}

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  isActive: boolean;
  categoryId: string | null;
}

// Price lives on ProductVariant, not Product — set 0 here; full price data comes from the API.
const TOPIC = "ecommerce.public.Product";

@Injectable()
export class CdcConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CdcConsumer.name);
  private consumer: Consumer;

  constructor(private readonly searchService: SearchService) {
    const kafka = new Kafka({
      clientId: "search-service",
      brokers: (process.env.KAFKA_BROKERS ?? "redpanda:9092").split(","),
      retry: { retries: 10 },
    });
    this.consumer = kafka.consumer({ groupId: "search-service-cdc" });
  }

  async onModuleInit(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: TOPIC, fromBeginning: true });
    void this.consumer.run({ eachMessage: (p) => this.handleMessage(p) });
    this.logger.log(`CDC consumer started — listening on ${TOPIC}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer.disconnect();
  }

  private async handleMessage({ message }: EachMessagePayload): Promise<void> {
    if (!message.value) return;

    let msg: DebeziumMessage;
    try {
      msg = JSON.parse(message.value.toString()) as DebeziumMessage;
    } catch {
      this.logger.warn("Received non-JSON message on CDC topic — skipping");
      return;
    }

    const { op, after, before } = msg;

    if (op === "d") {
      const productId = before?.id;
      if (productId) {
        await this.searchService.deleteProduct({ productId });
        this.logger.debug(`Removed product ${productId} from index (delete)`);
      }
      return;
    }

    if (!after) return;

    if (!after.isActive) {
      await this.searchService.deleteProduct({ productId: after.id });
      this.logger.debug(`Removed product ${after.id} from index (deactivated)`);
      return;
    }

    await this.searchService.indexProduct({
      productId: after.id,
      name: after.name,
      description: after.description,
      price: 0,
      categoryId: after.categoryId,
      slug: after.slug,
    });
    this.logger.debug(`Indexed product ${after.id} (op=${op})`);
  }
}
