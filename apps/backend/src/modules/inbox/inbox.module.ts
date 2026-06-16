import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { InboxService } from './inbox.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [InboxService],
  exports: [InboxService],
})
export class InboxModule {}
