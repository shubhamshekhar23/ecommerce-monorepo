import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@/common/decorators';
import { DatabaseHealthIndicator, RedisHealthIndicator } from './indicators';

// Memory threshold: alert when heap exceeds 512MB
const MEMORY_HEAP_THRESHOLD = 512 * 1024 * 1024;

// Disk threshold: 0.9 = alert when disk is 90% full.
// The terminus API uses a 0–1 decimal, NOT a 0–100 percentage.
// thresholdPercent: 0.5 would fire when the disk is only half full — a common bug.
const DISK_THRESHOLD_PERCENT = 0.9;

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  // Full health check: DB + Redis + memory + disk.
  // Used by load balancers / Docker healthcheck to decide if traffic should be sent here.
  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Full health check (DB, Redis, memory, disk)' })
  @ApiResponse({ status: 200, description: 'All systems healthy' })
  @ApiResponse({ status: 503, description: 'One or more systems unhealthy' })
  check() {
    return this.health.check([
      () => this.db.isHealthy(),
      () => this.redis.isHealthy(),
      () => this.memory.checkHeap('memory_heap', MEMORY_HEAP_THRESHOLD),
      () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: DISK_THRESHOLD_PERCENT }),
    ]);
  }

  // Readiness probe: is this instance ready to serve traffic?
  // Only checks hard dependencies (DB, Redis). If either is down, remove from load balancer.
  @Get('ready')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe — checks DB and Redis' })
  @ApiResponse({ status: 200, description: 'Ready to accept traffic' })
  @ApiResponse({ status: 503, description: 'Not ready yet' })
  readiness() {
    return this.health.check([
      () => this.db.isHealthy(),
      () => this.redis.isHealthy(),
    ]);
  }

  // Liveness probe: is the process alive and not deadlocked?
  // Only checks process-local state (memory, disk). Does NOT check DB/Redis —
  // a temporary DB blip should not restart the container.
  @Get('live')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe — checks memory and disk' })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  @ApiResponse({ status: 503, description: 'Process has issues' })
  liveness() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', MEMORY_HEAP_THRESHOLD),
      () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: DISK_THRESHOLD_PERCENT }),
    ]);
  }
}
