import { Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { CommonModule } from '@/common/common.module';
import { SoftDeletePurgeService } from './soft-delete-purge.service';

@Module({
  imports: [PrismaModule, CommonModule],
  providers: [SoftDeletePurgeService],
})
export class TasksModule {}
