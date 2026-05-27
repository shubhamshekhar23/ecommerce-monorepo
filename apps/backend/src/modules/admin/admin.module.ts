import { Module } from '@nestjs/common';
import { QueueModule } from '@/modules/queue/queue.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [QueueModule],
  controllers: [AdminController],
})
export class AdminModule {}
