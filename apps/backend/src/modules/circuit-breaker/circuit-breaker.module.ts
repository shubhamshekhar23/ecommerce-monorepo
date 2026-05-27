import { Module } from '@nestjs/common';
import { StripeModule } from '@/modules/stripe/stripe.module';
import { CircuitBreakerService } from './circuit-breaker.service';

@Module({
  imports: [StripeModule],
  providers: [CircuitBreakerService],
  exports: [CircuitBreakerService],
})
export class CircuitBreakerModule {}
