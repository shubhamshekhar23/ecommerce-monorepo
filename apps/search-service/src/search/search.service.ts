import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';
import type { ProductCreatedEvent, ProductUpdatedEvent, ProductDeletedEvent } from '@ecommerce/shared-types';

const INDEX = 'products';

export interface SearchHit {
  productId: string;
  name: string;
  description: string | null;
  price: number;
  categoryId: string | null;
  slug: string;
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private readonly client: Client;

  constructor() {
    this.client = new Client({
      node: process.env.OPENSEARCH_URL ?? 'http://localhost:9200',
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureIndexWithRetry();
  }

  private async ensureIndexWithRetry(retries = 8, delayMs = 5000): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.ensureIndex();
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (attempt === retries) {
          this.logger.error(`OpenSearch index setup failed after ${retries} attempts: ${msg}`);
          throw err;
        }
        this.logger.warn(`OpenSearch not ready (attempt ${attempt}/${retries}), retrying in ${delayMs / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  async indexProduct(event: ProductCreatedEvent | ProductUpdatedEvent): Promise<void> {
    const doc: SearchHit = {
      productId: event.productId,
      name: event.name ?? '',
      description: event.description ?? null,
      price: event.price ?? 0,
      categoryId: event.categoryId ?? null,
      slug: event.slug ?? '',
    };
    await this.client.index({ index: INDEX, id: event.productId, body: doc, refresh: 'wait_for' });
    this.logger.log(`Indexed product: ${event.productId}`);
  }

  async deleteProduct(event: ProductDeletedEvent): Promise<void> {
    await this.client.delete({ index: INDEX, id: event.productId, refresh: 'wait_for' });
    this.logger.log(`Deleted product from index: ${event.productId}`);
  }

  async search(query: string, from = 0, size = 20): Promise<SearchResult> {
    const body = query
      ? {
          query: {
            multi_match: {
              query,
              fields: ['name^3', 'description'],
              type: 'best_fields',
              fuzziness: 'AUTO',
            },
          },
        }
      : { query: { match_all: {} } };

    const response = await this.client.search({ index: INDEX, body: { ...body, from, size } });
    const hits = response.body.hits.hits.map((h: { _source: SearchHit }) => h._source as SearchHit);
    const total = (response.body.hits.total as { value: number }).value;
    return { hits, total };
  }

  private async ensureIndex(): Promise<void> {
    const { body: exists } = await this.client.indices.exists({ index: INDEX });
    if (exists) return;

    await this.client.indices.create({
      index: INDEX,
      body: {
        mappings: {
          properties: {
            productId: { type: 'keyword' },
            name: { type: 'text', analyzer: 'standard' },
            description: { type: 'text', analyzer: 'standard' },
            price: { type: 'float' },
            categoryId: { type: 'keyword' },
            slug: { type: 'keyword' },
          },
        },
      },
    });
    this.logger.log(`Created OpenSearch index: ${INDEX}`);
  }
}
