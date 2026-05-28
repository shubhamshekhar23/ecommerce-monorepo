import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { ITXClientDenyList } from '@prisma/client/runtime/library';
import { AsyncLocalStorage } from 'async_hooks';

type TransactionClient = Omit<PrismaClient, ITXClientDenyList>;

// Row-Level Security (RLS) context threaded via AsyncLocalStorage.
//
// Why AsyncLocalStorage?
//   PostgreSQL RLS policies read SET LOCAL variables (e.g. app.current_vendor_id).
//   SET LOCAL is transaction-scoped — the variable is reset when the transaction ends.
//   With PgBouncer in transaction mode, a connection is only leased for one transaction,
//   so SET LOCAL is safe: the next request that gets this connection will start fresh.
//
// Usage pattern:
//   await prisma.withRls({ vendorId: 'xxx' }, async () => {
//     // Every Prisma query here runs inside a transaction that starts with
//     // SET LOCAL app.current_vendor_id = 'xxx'
//     await prisma.product.findMany();
//   });
export interface RlsContext {
  vendorId?: string;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PrismaService');
  readonly rlsStorage = new AsyncLocalStorage<RlsContext>();

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.log('Database disconnected successfully');
    } catch (error) {
      this.logger.error('Error disconnecting from database:', error);
    }
  }

  // Wraps the callback in a transaction that sets session variables for RLS.
  // All Prisma queries inside fn() will be executed on the same connection
  // within that transaction, so SET LOCAL applies to all of them.
  async withRls<T>(context: RlsContext, fn: () => Promise<T>): Promise<T> {
    return this.$transaction(async (tx: TransactionClient) => {
      if (context.vendorId) {
        await tx.$executeRaw`SET LOCAL app.current_vendor_id = ${context.vendorId}`;
      }
      return this.rlsStorage.run(context, fn);
    });
  }
}
