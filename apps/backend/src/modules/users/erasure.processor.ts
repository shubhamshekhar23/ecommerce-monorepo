import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { Job } from 'bullmq';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';

export interface ErasureJobData {
  userId: string;
}

@Processor(QUEUE_NAMES.DATA_ERASURE)
export class ErasureProcessor extends WorkerHost {
  private readonly logger = new Logger(ErasureProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    super();
  }

  async process(job: Job<ErasureJobData>): Promise<void> {
    const { userId } = job.data;
    this.logger.log(`Processing erasure job=${job.id} userId=${userId}`);

    const request = await this.prisma.dataErasureRequest.findUnique({
      where: { userId },
    });

    if (!request || request.status !== 'PENDING') {
      this.logger.log(`Erasure skipped job=${job.id} status=${request?.status ?? 'not found'}`);
      return;
    }

    const anonymizedEmail = this.buildAnonEmail(userId);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: anonymizedEmail,
          firstName: '[Deleted]',
          lastName: '[Deleted]',
          phone: null,
          dateOfBirth: null,
          taxId: null,
          deletedAt: new Date(),
          isActive: false,
        },
      }),
      this.prisma.address.deleteMany({ where: { userId } }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.dataErasureRequest.update({
        where: { userId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      }),
    ]);

    await this.auditService.log({
      userId,
      action: 'USER_DATA_ERASED',
      after: { scheduledAt: request.scheduledAt },
    });

    this.logger.log(`Erasure complete job=${job.id} userId=${userId}`);
  }

  private buildAnonEmail(userId: string): string {
    const hash = createHash('sha256').update(userId).digest('hex').slice(0, 12);
    return `erased.${hash}@deleted.invalid`;
  }
}
