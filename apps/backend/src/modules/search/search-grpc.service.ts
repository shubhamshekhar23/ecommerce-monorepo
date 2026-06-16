import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom, Observable } from 'rxjs';

interface ProductPayload {
  id: string;
  name: string;
  price: number;
}

interface IndexResult {
  success: boolean;
}

interface SearchServiceStub {
  indexProduct(
    data: ProductPayload,
    metadata?: Metadata,
    options?: { deadline?: Date },
  ): Observable<IndexResult>;
}

const DEADLINE_SECONDS = 2;

@Injectable()
export class SearchGrpcService implements OnModuleInit {
  private readonly logger = new Logger(SearchGrpcService.name);
  private stub!: SearchServiceStub;

  constructor(@Inject('SEARCH_GRPC_CLIENT') private readonly client: ClientGrpc) {}

  onModuleInit(): void {
    this.stub = this.client.getService<SearchServiceStub>('SearchService');
  }

  async indexProduct(id: string, name: string, price: number): Promise<void> {
    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + DEADLINE_SECONDS);
    try {
      await firstValueFrom(
        this.stub.indexProduct({ id, name, price }, new Metadata(), {
          deadline,
        }),
      );
    } catch (err) {
      this.logger.warn(`gRPC search index failed for product ${id}: ${(err as Error).message}`);
    }
  }
}
