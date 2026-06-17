import { Global, Module } from '@nestjs/common';
import { CorrelationIdService } from './services/correlation-id.service';
import { DistributedLockService } from './services/distributed-lock.service';

// @Global makes services available in every module without explicit import.
// Appropriate for cross-cutting concerns used everywhere (correlation IDs, locks).
@Global()
@Module({
  providers: [CorrelationIdService, DistributedLockService],
  exports: [CorrelationIdService, DistributedLockService],
})
export class CommonModule {}
