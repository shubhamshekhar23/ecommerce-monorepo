import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAuditLogDto {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  entity?: string;
  entityId?: string;
  before?: object;
  after?: object;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Fire-and-forget: audit log failures must never break the caller.
  async log(entry: CreateAuditLogDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          ...entry,
          before: entry.before as object | undefined,
          after: entry.after as object | undefined,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit log [${entry.action}]: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
