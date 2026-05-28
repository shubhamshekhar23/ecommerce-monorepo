import { Global, Module } from '@nestjs/common';
import { CorrelationIdService } from './services/correlation-id.service';

// @Global makes CorrelationIdService available in every module without
// explicit import — similar to how ConfigModule.forRoot({ isGlobal: true }) works.
// Appropriate here because correlation IDs are a cross-cutting concern used
// everywhere (services, workers, outgoing HTTP).
@Global()
@Module({
  providers: [CorrelationIdService],
  exports: [CorrelationIdService],
})
export class CommonModule {}
