import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { ReadReplicaService } from './read-replica.service';
import type { SlowQueryDto, TableStatDto, ReplicationLagDto } from './dto/slow-query.dto';

// Raw type returned by pg_stat_statements (all fields are strings or numbers from Postgres)
interface PgStatStatement {
  query: string;
  calls: bigint;
  total_exec_time: number;
  mean_exec_time: number;
  rows: bigint;
  stddev_exec_time: number;
}

interface PgStatTable {
  relname: string;
  n_live_tup: bigint;
  n_dead_tup: bigint;
  n_mod_since_analyze: bigint;
  last_autovacuum: Date | null;
  last_autoanalyze: Date | null;
  total_size: string;
}

interface ReplicationRow {
  lag_seconds: number | null;
}

@Injectable()
export class DbAnalyticsService {
  private readonly logger = new Logger(DbAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly readReplica: ReadReplicaService,
  ) {}

  // Top N queries by total execution time.
  // total_exec_time = calls × mean_exec_time.
  // A query called 1M times with 1ms average costs MORE than a query called 10 times
  // with 500ms average. This is why total_exec_time, not mean, is the right sort key
  // for finding what to optimize first.
  async getSlowQueries(limit = 10): Promise<SlowQueryDto[]> {
    const rows = await this.readReplica.$queryRaw<PgStatStatement[]>`
      SELECT
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        rows,
        stddev_exec_time
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
        AND query NOT LIKE '%pg_stat_activity%'
      ORDER BY total_exec_time DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      query: r.query.trim().slice(0, 500),
      calls: Number(r.calls),
      meanExecMs: parseFloat(r.mean_exec_time.toFixed(3)),
      totalExecMs: parseFloat(r.total_exec_time.toFixed(3)),
      rows: Number(r.rows),
      stddevExecMs: parseFloat(r.stddev_exec_time.toFixed(3)),
    }));
  }

  // Reset pg_stat_statements counters.
  // Use this after adding an index or optimizing a query so you can measure
  // the improvement from a clean baseline.
  // $executeRaw is used here because pg_stat_statements_reset() returns void —
  // $queryRaw would fail on a function that returns no rows.
  async resetStats(): Promise<void> {
    await this.prisma.$executeRaw`SELECT pg_stat_statements_reset()`;
    this.logger.log('pg_stat_statements reset');
  }

  // Dead tuples and table bloat per table.
  // Dead tuples accumulate because PostgreSQL MVCC never overwrites rows in place —
  // UPDATE writes a new version, marks the old one dead. VACUUM reclaims them.
  // > 20% dead tuple ratio on a heavily-written table means autovacuum is falling behind.
  async getTableStats(): Promise<TableStatDto[]> {
    const rows = await this.readReplica.$queryRaw<PgStatTable[]>`
      SELECT
        st.relname,
        st.n_live_tup,
        st.n_dead_tup,
        st.n_mod_since_analyze,
        st.last_autovacuum,
        st.last_autoanalyze,
        pg_size_pretty(pg_total_relation_size(st.relid)) AS total_size
      FROM pg_stat_user_tables st
      ORDER BY st.n_dead_tup DESC
    `;

    return rows.map((r) => {
      const live = Number(r.n_live_tup);
      const dead = Number(r.n_dead_tup);
      const total = live + dead;
      const deadPercent = total > 0 ? parseFloat(((dead / total) * 100).toFixed(1)) : 0;

      return {
        tableName: r.relname,
        liveTuples: live,
        deadTuples: dead,
        deadTuplePercent: deadPercent,
        totalSize: r.total_size,
        modsSinceAnalyze: Number(r.n_mod_since_analyze),
        lastAutovacuum: r.last_autovacuum,
        lastAutoanalyze: r.last_autoanalyze,
      };
    });
  }

  // Queries the REPLICA for replication lag.
  // pg_last_xact_replay_timestamp() returns the timestamp of the last WAL record
  // applied on the replica. lag = now() - that timestamp.
  // Typical lag in a healthy setup: < 1 second.
  // Lag > 30s means the replica is falling behind — queries there may return stale data.
  async getReplicationLag(): Promise<ReplicationLagDto> {
    try {
      const rows = await this.readReplica.$queryRaw<ReplicationRow[]>`
        SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::FLOAT AS lag_seconds
      `;

      const lag = rows[0]?.lag_seconds ?? null;

      return {
        replicaConnected: true,
        lagSeconds: lag !== null ? parseFloat(lag.toFixed(3)) : null,
        lagDescription:
          lag !== null ? `${lag.toFixed(1)} seconds behind primary` : 'No WAL applied yet',
      };
    } catch {
      return {
        replicaConnected: false,
        lagSeconds: null,
        lagDescription: 'Replica not reachable — is docker-compose.replica.yml active?',
      };
    }
  }

  // Check replication lag from the PRIMARY side.
  // pg_stat_replication shows connected replicas and their byte-level lag.
  async getPrimaryReplicationStatus(): Promise<unknown[]> {
    const rows = await this.prisma.$queryRaw<unknown[]>`
      SELECT
        client_addr,
        state,
        sent_lsn,
        write_lsn,
        flush_lsn,
        replay_lsn,
        (sent_lsn - replay_lsn) AS lag_bytes,
        sync_state
      FROM pg_stat_replication
    `;
    return rows;
  }

  // Create the next quarter partition for RequestMetric.
  // Call this at the start of each quarter (or automate with a cron job).
  // Failing to create the partition before new timestamps arrive causes an error:
  // "no partition of relation 'RequestMetric' found for row"
  async createNextPartition(): Promise<string> {
    const result = await this.prisma.$queryRaw<[{ create_next_quarter_partition: string }]>`
      SELECT create_next_quarter_partition()
    `;
    const message = result[0].create_next_quarter_partition;
    this.logger.log(`Partition management: ${message}`);
    return message;
  }

  // List existing partitions of RequestMetric with their row counts and sizes.
  // All numeric fields are cast to TEXT to avoid BigInt JSON serialization failure.
  async getPartitionInfo(): Promise<unknown[]> {
    return this.prisma.$queryRaw`
      SELECT
        child.relname                                               AS partition_name,
        pg_get_expr(child.relpartbound, child.oid)                  AS partition_range,
        pg_size_pretty(pg_total_relation_size(child.oid))           AS size,
        child.reltuples::BIGINT::TEXT                               AS estimated_rows
      FROM pg_inherits
      JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
      JOIN pg_class child  ON pg_inherits.inhrelid  = child.oid
      WHERE parent.relname = 'RequestMetric'
      ORDER BY child.relname
    `;
  }
}
