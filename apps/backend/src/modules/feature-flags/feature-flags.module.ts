import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagsController } from './feature-flags.controller';

// @Global so FeatureFlagService can be injected in guards and any module
// without explicit import — feature flags are a cross-cutting concern.
@Global()
@Module({
  imports: [PrismaModule],
  providers: [FeatureFlagService],
  controllers: [FeatureFlagsController],
  exports: [FeatureFlagService],
})
export class FeatureFlagsModule {}
