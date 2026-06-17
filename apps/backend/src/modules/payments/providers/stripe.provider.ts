import { Injectable, OnModuleInit } from '@nestjs/common';
import { StripeService } from '@/modules/stripe/stripe.service';
import { isRetriableStripeError } from '@/modules/stripe/stripe.helpers';
import { PaymentPluginRegistry } from '../registry/payment-plugin.registry';
import type { IPaymentProvider, PaymentIntent } from '../interfaces/payment-provider.interface';

@Injectable()
export class StripeProvider implements IPaymentProvider, OnModuleInit {
  constructor(
    private readonly stripeService: StripeService,
    private readonly registry: PaymentPluginRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  getProviderName(): string {
    return 'stripe';
  }

  async createPaymentIntent(
    orderId: string,
    amount: number,
    _currency: string,
  ): Promise<PaymentIntent> {
    const intent = await this.stripeService.createPaymentIntent(orderId, amount);
    return {
      id: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      metadata: (intent.metadata ?? {}) as Record<string, string>,
    };
  }

  isRetriableError(error: unknown): boolean {
    return isRetriableStripeError(error);
  }
}
