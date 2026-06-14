import { ApiProperty } from '@nestjs/swagger';

export class SlowQueryDto {
  @ApiProperty({ description: 'Normalized query text (literals replaced by $1, $2...)' })
  query!: string;

  @ApiProperty({ description: 'Total number of times this query was executed' })
  calls!: number;

  @ApiProperty({ description: 'Average execution time in milliseconds' })
  meanExecMs!: number;

  @ApiProperty({
    description:
      'Total execution time across all calls (ms). Sort by this to find the most expensive queries.',
  })
  totalExecMs!: number;

  @ApiProperty({ description: 'Total rows returned or affected' })
  rows!: number;

  @ApiProperty({
    description: 'Standard deviation of execution time — high stddev = inconsistent query',
  })
  stddevExecMs!: number;
}

export class TableStatDto {
  @ApiProperty()
  tableName!: string;

  @ApiProperty({ description: 'Estimated number of live (visible) rows' })
  liveTuples!: number;

  @ApiProperty({
    description:
      'Dead rows that have been updated/deleted but not yet vacuumed. High dead tuples = bloat.',
  })
  deadTuples!: number;

  @ApiProperty({
    description: 'Dead tuples as a percentage of live + dead. > 20% warrants manual VACUUM.',
  })
  deadTuplePercent!: number;

  @ApiProperty({ description: 'Total table size including indexes (human-readable)' })
  totalSize!: string;

  @ApiProperty({ description: 'Number of row modifications since last ANALYZE' })
  modsSinceAnalyze!: number;

  @ApiProperty({ nullable: true, description: 'Last time autovacuum ran on this table' })
  lastAutovacuum!: Date | null;

  @ApiProperty({ nullable: true, description: 'Last time autoanalyze ran on this table' })
  lastAutoanalyze!: Date | null;
}

export class ReplicationLagDto {
  @ApiProperty({ description: 'Whether replica is configured and reachable' })
  replicaConnected!: boolean;

  @ApiProperty({ nullable: true, description: 'Lag between primary and replica in seconds' })
  lagSeconds!: number | null;

  @ApiProperty({ nullable: true, description: 'Human-readable lag (e.g. "1.2 seconds")' })
  lagDescription!: string | null;
}
