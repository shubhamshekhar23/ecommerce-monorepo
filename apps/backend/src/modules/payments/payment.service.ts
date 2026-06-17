import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { CircuitBreakerService } from '@/modules/circuit-breaker/circuit-breaker.service';
import { PaymentPluginRegistry } from './registry/payment-plugin.registry';
import type { PaymentIntent } from './interfaces/payment-provider.interface';
import type { PaymentRetryJobData } from './payment-retry.processor';

/*
 - PaymentService is the public facade for the Microkernel.
 - OrderSagaService injects this instead of CircuitBreakerService directly.
 - Swapping providers is a one-env-var change: DEFAULT_PAYMENT_PROVIDER=paypal.
 - The circuit breaker still wraps the active provider call for resilience.
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly registry: PaymentPluginRegistry,
    private readonly circuitBreaker: CircuitBreakerService,
    @InjectQueue('payment-retry') private readonly retryQueue: Queue,
  ) {}

  async charge(orderId: string, amount: number): Promise<PaymentIntent | null> {
    const provider = this.registry.getDefault();
    try {
      return await this.circuitBreaker.createPaymentIntent(orderId, amount);
    } catch (error) {
      if (provider.isRetriableError(error)) {
        const jobData: PaymentRetryJobData = { orderId, amount };
        await this.retryQueue.add('retry', jobData, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
        });
        this.logger.warn(`Payment queued for retry: orderId=${orderId}`);
        return null;
      }
      throw error;
    }
  }
}
