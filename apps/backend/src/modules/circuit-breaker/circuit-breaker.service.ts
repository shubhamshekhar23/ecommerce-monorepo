import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import CircuitBreaker from 'opossum';
import { StripeService } from '@/modules/stripe/stripe.service';
import { isBugScenario } from '@/modules/debug-scenarios/bug-scenario.guard';

// Circuit-breaker states (opossum automaton):
//
//   CLOSED ──(failure rate > threshold)──► OPEN
//     ▲                                      │
//     └──(probe succeeds)─── HALF-OPEN ◄─────┘
//                            (resetTimeout)
//
// Why wrap Stripe specifically?
// Payment calls are the most latency-sensitive external dependency. Without a
// breaker, a Stripe outage causes every order request to hang for `timeout`ms,
// exhausting the thread pool and making the entire API unresponsive.
// With the breaker OPEN, orders fail fast (<1ms) and the frontend can show a
// "try again later" message instead of a spinner that never resolves.

type PaymentIntent = Awaited<ReturnType<StripeService['createPaymentIntent']>>;

const BREAKER_OPTIONS: CircuitBreaker.Options = {
  timeout: 5_000,
  errorThresholdPercentage: 50,
  resetTimeout: 30_000,
  // Don't open the circuit until we have seen at least N requests. Prevents
  // tripping on the very first flaky request during a cold start.
  volumeThreshold: 5,
};

@Injectable()
export class CircuitBreakerService implements OnModuleInit {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private breaker!: CircuitBreaker<[string, number], PaymentIntent>;

  constructor(private readonly stripeService: StripeService) {}

  onModuleInit(): void {
    /*
     - S16: circuit never opens — timeout too short (100 ms) + instant reset (1 ms).
     - Retries hammer the failing service; payment failure rate >> request rate.
     - Signal: Grafana payment_events_total{failed} rate 3-5x HTTP request rate.
     - Jaeger: single HTTP span has multiple Stripe child spans (retries), all failing.
    */
    const options = isBugScenario(16)
      ? { ...BREAKER_OPTIONS, timeout: 100, resetTimeout: 1, volumeThreshold: 1 }
      : BREAKER_OPTIONS;

    this.breaker = new CircuitBreaker(
      (orderId: string, amount: number) =>
        this.stripeService.createPaymentIntent(orderId, amount),
      options,
    );

    this.breaker.on('open', () => this.logger.warn('Circuit breaker OPEN — Stripe unreachable'));
    this.breaker.on('halfOpen', () => this.logger.warn('Circuit breaker HALF-OPEN — probing'));
    this.breaker.on('close', () => this.logger.log('Circuit breaker CLOSED — Stripe recovered'));
    this.breaker.on('fallback', () => this.logger.warn('Circuit breaker fallback fired'));
  }

  async createPaymentIntent(orderId: string, amount: number): Promise<PaymentIntent> {
    try {
      return await (this.breaker.fire(orderId, amount) as Promise<PaymentIntent>);
    } catch (error) {
      if (this.breaker.opened) {
        throw new ServiceUnavailableException(
          'Payment service is temporarily unavailable. Please try again in a few minutes.',
        );
      }
      throw error;
    }
  }

  get isOpen(): boolean {
    return this.breaker.opened;
  }

  get stats(): CircuitBreaker.Stats {
    return this.breaker.stats;
  }
}
