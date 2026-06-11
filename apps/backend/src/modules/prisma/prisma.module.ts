import { Module } from '@nestjs/common';
import { MetricsModule } from '@/modules/metrics/metrics.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [MetricsModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
