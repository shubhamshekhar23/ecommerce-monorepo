import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage is Node's built-in mechanism for "thread-local storage".
// Each HTTP request gets its own store, so correlationId flows through
// every function call — DB queries, BullMQ jobs, outgoing HTTP — without
// being passed as a parameter everywhere.
@Injectable()
export class CorrelationIdService {
  private readonly storage = new AsyncLocalStorage<Map<string, string>>();

  run<T>(correlationId: string, fn: () => T): T {
    const store = new Map<string, string>();
    store.set('correlationId', correlationId);
    return this.storage.run(store, fn);
  }

  get(): string | undefined {
    return this.storage.getStore()?.get('correlationId');
  }
}
