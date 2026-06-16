import { Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsHandler } from './reviews.handler';
import { ReviewsLoader } from './reviews.loader';

@Module({
  imports: [PrismaModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewsHandler, ReviewsLoader],
  exports: [ReviewsService, ReviewsLoader],
})
export class ReviewsModule {}
