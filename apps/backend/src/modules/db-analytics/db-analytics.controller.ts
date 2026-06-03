import { Controller, Get, Post, Query, HttpCode, HttpStatus, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Roles } from '@/common/decorators';
import { UserRole } from '@prisma/client';
import { DbAnalyticsService } from './db-analytics.service';
import type { SlowQueryDto, TableStatDto, ReplicationLagDto } from './dto/slow-query.dto';

@ApiTags('admin/db')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/db')
export class DbAnalyticsController {
  constructor(private readonly dbAnalytics: DbAnalyticsService) {}

  // ── pg_stat_statements ──────────────────────────────────────────────────────

  @Get('slow-queries')
  @ApiOperation({
    summary: 'Top N queries by total execution time',
    description:
      'Sorted by total_exec_time (calls × mean). This is the right metric: ' +
      'a query called 1M times at 1ms each costs more than one called 10 times at 500ms. ' +
      'Add an index, then call POST /reset-stats and monitor again.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getSlowQueries(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<SlowQueryDto[]> {
    return this.dbAnalytics.getSlowQueries(limit);
  }

  @Post('reset-stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset pg_stat_statements counters',
    description: 'Call after adding an index or optimizing a query to measure improvement from a clean baseline.',
  })
  async resetStats(): Promise<{ message: string }> {
    await this.dbAnalytics.resetStats();
    return { message: 'pg_stat_statements reset successfully' };
  }

  // ── Table stats & bloat ─────────────────────────────────────────────────────

  @Get('table-stats')
  @ApiOperation({
    summary: 'Dead tuples, live tuples, and sizes for all user tables',
    description:
      'Dead tuples accumulate via PostgreSQL MVCC — every UPDATE/DELETE creates a dead row. ' +
      'VACUUM reclaims them. deadTuplePercent > 20% on a high-write table means autovacuum ' +
      'is falling behind. Use this to decide when to run manual VACUUM.',
  })
  async getTableStats(): Promise<TableStatDto[]> {
    return this.dbAnalytics.getTableStats();
  }

  // ── Replication ─────────────────────────────────────────────────────────────

  @Get('replication/lag')
  @ApiOperation({
    summary: 'Replication lag measured from the replica',
    description:
      'Queries pg_last_xact_replay_timestamp() on the replica. ' +
      'Typical healthy lag: < 1 second. > 30s = stale reads risk on analytics queries. ' +
      'Returns replicaConnected: false if the replica is not configured.',
  })
  async getReplicationLag(): Promise<ReplicationLagDto> {
    return this.dbAnalytics.getReplicationLag();
  }

  @Get('replication/status')
  @ApiOperation({
    summary: 'Replication status from the primary (pg_stat_replication)',
    description:
      'Shows connected replicas and byte-level lag. ' +
      'lag_bytes = sent_lsn - replay_lsn. ' +
      'Empty result means no replicas are connected.',
  })
  async getPrimaryReplicationStatus(): Promise<unknown[]> {
    return this.dbAnalytics.getPrimaryReplicationStatus();
  }

  // ── Partition management ────────────────────────────────────────────────────

  @Get('partitions')
  @ApiOperation({
    summary: 'List RequestMetric partitions with size info',
    description: 'Shows all quarterly partitions of the RequestMetric table and their ranges.',
  })
  async getPartitions(): Promise<unknown[]> {
    return this.dbAnalytics.getPartitionInfo();
  }

  @Post('partitions/create-next')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create the next quarter partition for RequestMetric',
    description:
      'Run this at the start of each quarter (or automate with a cron job). ' +
      'If the partition already exists, returns a message and does nothing. ' +
      'Missing a partition causes INSERT errors: "no partition of relation found for row".',
  })
  async createNextPartition(): Promise<{ message: string }> {
    const message = await this.dbAnalytics.createNextPartition();
    return { message };
  }
}
