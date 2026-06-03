import { Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { DbAnalyticsService } from './db-analytics.service';
import { DbAnalyticsController } from './db-analytics.controller';
import { ReadReplicaService } from './read-replica.service';

@Module({
  imports: [PrismaModule],
  providers: [DbAnalyticsService, ReadReplicaService],
  controllers: [DbAnalyticsController],
  exports: [ReadReplicaService],
})
export class DbAnalyticsModule {}
