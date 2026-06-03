import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

// ReadReplicaService connects to the PostgreSQL read replica.
//
// Why a separate PrismaClient instead of reusing PrismaService?
//   PrismaService connects to DATABASE_URL (via PgBouncer → primary).
//   The replica has a different connection string pointing to postgres-replica:5432.
//   There is no way to make a single PrismaClient switch between two databases
//   per query — you need two client instances.
//
// Fallback behaviour:
//   If READ_REPLICA_DATABASE_URL is not set (e.g. docker-compose.replica.yml is not active),
//   this service falls back to DIRECT_DATABASE_URL (primary direct connection).
//   This means analytics endpoints work in both replica and no-replica setups — they just
//   hit the primary when there is no replica.
//
// What queries should use the replica?
//   - Admin analytics: slow query stats, table bloat, metrics aggregations
//   - Report generation: order summaries, revenue calculations
//   - Any query that is acceptable to be seconds behind the primary
//
// What queries must NOT use the replica?
//   - Stock checks at checkout (stale stock = oversell)
//   - Payment confirmation reads
//   - Any business-critical read where stale data has real consequences
@Injectable()
export class ReadReplicaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReadReplicaService.name);

  constructor(config: ConfigService) {
    const replicaUrl = config.get<string>('READ_REPLICA_DATABASE_URL');
    const fallbackUrl = config.get<string>('DIRECT_DATABASE_URL');
    const url = replicaUrl ?? fallbackUrl;

    super({ datasources: { db: { url } } });

    if (replicaUrl) {
      new Logger(ReadReplicaService.name).log('Connected to read replica');
    } else {
      new Logger(ReadReplicaService.name).log(
        'READ_REPLICA_DATABASE_URL not set — falling back to primary (DIRECT_DATABASE_URL)',
      );
    }
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('ReadReplicaService connected');
    } catch (error) {
      this.logger.warn('ReadReplicaService could not connect — replica may not be running', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
