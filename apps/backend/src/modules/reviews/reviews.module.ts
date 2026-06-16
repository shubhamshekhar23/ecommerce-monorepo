import { Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { OutboxModule } from '@/modules/outbox/outbox.module';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ReviewConsumer } from './reviews.consumer';
import { ReviewsLoader } from './reviews.loader';

@Module({
  imports: [PrismaModule, OutboxModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewConsumer, ReviewsLoader],
  exports: [ReviewsService, ReviewsLoader],
})
export class ReviewsModule {}
