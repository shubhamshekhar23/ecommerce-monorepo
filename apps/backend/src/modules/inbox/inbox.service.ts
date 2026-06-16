import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';

@Injectable()
export class InboxService {
  constructor(private readonly prisma: PrismaService) {}

  async isProcessed(messageId: string): Promise<boolean> {
    const existing = await this.prisma.inboxMessage.findUnique({ where: { messageId } });
    return existing !== null;
  }

  /*
   - Uses upsert so concurrent duplicate deliveries converge safely.
   - Two consumers racing on the same messageId both succeed without constraint violation.
   */
  async markProcessed(messageId: string): Promise<void> {
    await this.prisma.inboxMessage.upsert({
      where: { messageId },
      create: { messageId },
      update: {},
    });
  }
}
