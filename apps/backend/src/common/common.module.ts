import { Global, Module } from '@nestjs/common';
import { CorrelationIdService } from './services/correlation-id.service';
import { DistributedLockService } from './services/distributed-lock.service';
import { LeaderElectionService } from './services/leader-election.service';

// @Global makes services available in every module without explicit import.
// Appropriate for cross-cutting concerns used everywhere (correlation IDs, locks).
@Global()
@Module({
  providers: [CorrelationIdService, DistributedLockService, LeaderElectionService],
  exports: [CorrelationIdService, DistributedLockService, LeaderElectionService],
})
export class CommonModule {}
