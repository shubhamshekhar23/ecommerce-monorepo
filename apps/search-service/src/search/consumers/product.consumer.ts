import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';
import { EXCHANGES, ROUTING_KEYS, QUEUES } from '@ecommerce/shared-types';
import type { ProductCreatedEvent, ProductUpdatedEvent, ProductDeletedEvent } from '@ecommerce/shared-types';
import { SearchService } from '../search.service';

@Injectable()
export class ProductConsumer {
  private readonly logger = new Logger(ProductConsumer.name);

  constructor(private readonly searchService: SearchService) {}

  @RabbitSubscribe({
    exchange: EXCHANGES.PRODUCT,
    routingKey: ROUTING_KEYS.PRODUCT.CREATED,
    queue: QUEUES.PRODUCT_SEARCH_INDEX,
    queueOptions: { durable: true },
  })
  async handleProductCreated(event: ProductCreatedEvent): Promise<void | Nack> {
    try {
      await this.searchService.indexProduct(event);
    } catch (err) {
      this.logger.error(`Failed to index product ${event.productId}: ${String(err)}`);
      return new Nack(false);
    }
  }

  @RabbitSubscribe({
    exchange: EXCHANGES.PRODUCT,
    routingKey: ROUTING_KEYS.PRODUCT.UPDATED,
    queue: `${QUEUES.PRODUCT_SEARCH_INDEX}.updated`,
    queueOptions: { durable: true },
  })
  async handleProductUpdated(event: ProductUpdatedEvent): Promise<void | Nack> {
    try {
      await this.searchService.indexProduct(event);
    } catch (err) {
      this.logger.error(`Failed to re-index product ${event.productId}: ${String(err)}`);
      return new Nack(false);
    }
  }

  @RabbitSubscribe({
    exchange: EXCHANGES.PRODUCT,
    routingKey: ROUTING_KEYS.PRODUCT.DELETED,
    queue: `${QUEUES.PRODUCT_SEARCH_INDEX}.deleted`,
    queueOptions: { durable: true },
  })
  async handleProductDeleted(event: ProductDeletedEvent): Promise<void | Nack> {
    try {
      await this.searchService.deleteProduct(event);
    } catch (err) {
      this.logger.error(`Failed to delete product ${event.productId} from index: ${String(err)}`);
      return new Nack(false);
    }
  }
}
