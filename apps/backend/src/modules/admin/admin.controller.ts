import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Roles } from '@/common/decorators';
import { UserRole } from '@prisma/client';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';

const ACTIVE_QUEUES = [QUEUE_NAMES.STOCK_ALERTS, QUEUE_NAMES.CART_RECOVERY] as const;

@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/queue')
export class AdminController {
  constructor(
    @InjectQueue(QUEUE_NAMES.STOCK_ALERTS) private readonly stockAlertsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CART_RECOVERY) private readonly cartRecoveryQueue: Queue,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get job counts for all active queues' })
  async getStats(): Promise<Record<string, Record<string, number>>> {
    const [stockAlerts, cartRecovery] = await Promise.all([
      this.stockAlertsQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      this.cartRecoveryQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
    ]);
    return {
      [QUEUE_NAMES.STOCK_ALERTS]: stockAlerts,
      [QUEUE_NAMES.CART_RECOVERY]: cartRecovery,
    };
  }

  @Get('dlq')
  @ApiOperation({ summary: 'List failed jobs across all active queues' })
  @ApiQuery({ name: 'queue', enum: ACTIVE_QUEUES, required: false })
  async getDlq(@Query('queue') queueName?: string): Promise<{ jobs: unknown[] }> {
    const queue = this.resolveQueue(queueName);
    const queues = queue ? [queue] : [this.stockAlertsQueue, this.cartRecoveryQueue];

    const results = await Promise.all(queues.map((q) => q.getFailed(0, 49)));
    const jobs = results.flat().map((j) => ({
      id: j.id,
      name: j.name,
      data: j.data,
      failedReason: j.failedReason,
      attemptsMade: j.attemptsMade,
      timestamp: j.timestamp,
    }));

    return { jobs };
  }

  @Post('dlq/:jobId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed job' })
  @ApiQuery({ name: 'queue', enum: ACTIVE_QUEUES, required: true })
  async retryJob(
    @Param('jobId') jobId: string,
    @Query('queue') queueName: string,
  ): Promise<{ success: boolean }> {
    const queue = this.resolveQueue(queueName);
    if (!queue) throw new NotFoundException('Unknown queue');

    const job = await queue.getJob(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);

    await job.retry();
    return { success: true };
  }

  @Post('dlq/clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear failed jobs from a queue' })
  @ApiQuery({ name: 'queue', enum: ACTIVE_QUEUES, required: true })
  async clearDlq(@Query('queue') queueName: string): Promise<{ removed: number }> {
    const queue = this.resolveQueue(queueName);
    if (!queue) throw new NotFoundException('Unknown queue');

    const jobs = await queue.getFailed(0, 999);
    await Promise.all(jobs.map((j) => j.remove()));
    return { removed: jobs.length };
  }

  private resolveQueue(name?: string): Queue | null {
    if (name === QUEUE_NAMES.STOCK_ALERTS) return this.stockAlertsQueue;
    if (name === QUEUE_NAMES.CART_RECOVERY) return this.cartRecoveryQueue;
    return null;
  }
}
