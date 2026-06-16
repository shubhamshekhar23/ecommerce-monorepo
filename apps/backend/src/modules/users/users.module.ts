import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ErasureProcessor } from './erasure.processor';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.DATA_ERASURE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: 20,
        removeOnFail: 20,
      },
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, ErasureProcessor],
  exports: [UsersService],
})
export class UsersModule {}
