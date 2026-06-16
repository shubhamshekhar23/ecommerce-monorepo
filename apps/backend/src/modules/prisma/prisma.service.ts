import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { PrismaClient, Prisma } from '@prisma/client';
import type { ITXClientDenyList } from '@prisma/client/runtime/library';
import { AsyncLocalStorage } from 'async_hooks';
import { Histogram } from 'prom-client';
import * as api from '@opentelemetry/api';
import { EncryptionService } from '@/modules/encryption/encryption.service';

const ENCRYPTED_FIELDS = ['phone', 'dateOfBirth', 'taxId'] as const;

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

  constructor(
    @InjectMetric('db_client_operation_duration') private readonly dbDuration: Histogram<string>,
    private readonly encryption: EncryptionService,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    this.registerEncryptionMiddleware();
    this.registerTracingMiddleware();
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  private encryptFields(data: Record<string, unknown>): void {
    for (const field of ENCRYPTED_FIELDS) {
      if (typeof data[field] === 'string') {
        data[field] = this.encryption.encrypt(data[field] as string);
      }
    }
  }

  private decryptRow(row: Record<string, unknown>): void {
    for (const field of ENCRYPTED_FIELDS) {
      const v = row[field];
      if (typeof v === 'string' && this.encryption.isEncrypted(v)) {
        row[field] = this.encryption.decrypt(v);
      }
    }
  }

  private decryptResult(result: unknown): void {
    if (!result) return;
    if (Array.isArray(result)) {
      result.forEach((r) => this.decryptRow(r as Record<string, unknown>));
    } else {
      this.decryptRow(result as Record<string, unknown>);
    }
  }

  private registerEncryptionMiddleware(): void {
    if (!this.encryption.isEnabled) return;
    this.$use(async (params: Prisma.MiddlewareParams, next) => {
      if (params.model === 'User') {
        if (['create', 'update'].includes(params.action) && params.args.data) {
          this.encryptFields(params.args.data as Record<string, unknown>);
        }
        if (params.action === 'upsert') {
          this.encryptFields((params.args.create ?? {}) as Record<string, unknown>);
          this.encryptFields((params.args.update ?? {}) as Record<string, unknown>);
        }
      }
      const result = await next(params);
      if (params.model === 'User') this.decryptResult(result);
      return result;
    });
  }

  /*
   - Adds a $use middleware that wraps every Prisma query in an OTEL span.
   - Uses the public api.trace API (not @prisma/instrumentation) to stay
   - compatible with any sdk-trace-base version.
   */
  private registerTracingMiddleware(): void {
    this.$use((params: Prisma.MiddlewareParams, next) => this.executeWithTracing(params, next));
  }

  private async executeWithTracing(
    params: Prisma.MiddlewareParams,
    next: (p: Prisma.MiddlewareParams) => Promise<unknown>,
  ): Promise<unknown> {
    const model = params.model ?? 'raw';
    const start = Date.now();
    const span = api.trace.getTracer('prisma').startSpan(`prisma ${model}.${params.action}`, {
      kind: api.SpanKind.CLIENT,
      attributes: {
        'db.system': 'postgresql',
        'db.operation': params.action,
        'db.sql.table': model,
      },
    });
    return api.context.with(api.trace.setSpan(api.context.active(), span), async () => {
      try {
        const result = await next(params);
        span.setStatus({ code: api.SpanStatusCode.OK });
        return result;
      } catch (err) {
        span.recordException(err as Error);
        span.setStatus({ code: api.SpanStatusCode.ERROR, message: (err as Error).message });
        throw err;
      } finally {
        span.end();
        this.dbDuration
          .labels({ db_operation: params.action, db_sql_table: model })
          .observe((Date.now() - start) / 1000);
      }
    });
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
