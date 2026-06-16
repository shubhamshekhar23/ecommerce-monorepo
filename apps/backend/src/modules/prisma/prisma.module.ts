import { Module } from '@nestjs/common';
import { MetricsModule } from '@/modules/metrics/metrics.module';
import { EncryptionModule } from '@/modules/encryption/encryption.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [MetricsModule, EncryptionModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
