import {
  Controller,
  Get,
  Post,
  Param,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Roles } from '@/common/decorators';
import { UserRole } from '@prisma/client';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';
import type { NotificationJobPayload } from '@/modules/queue/dto/notification-job.dto';

// Why expose a DLQ admin endpoint?
// When a notification job exhausts all BullMQ retry attempts, it lands in the
// "failed" set (our Dead Letter Queue).  Without visibility, those jobs are
// silently lost.  This endpoint lets on-call engineers inspect and replay them
// without touching Redis directly or redeploying the app.
@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/queue')
export class AdminController {
  constructor(
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue<NotificationJobPayload>,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get notifications queue stats' })
  async getStats(): Promise<Record<string, number>> {
    const counts = await this.notificationsQueue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
    );
    return counts;
  }

  @Get('dlq')
  @ApiOperation({ summary: 'List failed notification jobs (DLQ)' })
  async getDlq(): Promise<{ jobs: unknown[] }> {
    const jobs = await this.notificationsQueue.getFailed(0, 49);
    const mapped = jobs.map((j) => ({
      id: j.id,
      name: j.name,
      data: j.data,
      failedReason: j.failedReason,
      attemptsMade: j.attemptsMade,
      timestamp: j.timestamp,
    }));
    return { jobs: mapped };
  }

  @Post('dlq/:jobId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed job from the DLQ' })
  async retryJob(@Param('jobId') jobId: string): Promise<{ success: boolean }> {
    const job = await this.notificationsQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found in DLQ`);
    }

    await job.retry();
    return { success: true };
  }

  @Post('dlq/clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all failed jobs from the DLQ' })
  async clearDlq(): Promise<{ removed: number }> {
    const jobs = await this.notificationsQueue.getFailed(0, 999);
    await Promise.all(jobs.map((j) => j.remove()));
    return { removed: jobs.length };
  }
}
