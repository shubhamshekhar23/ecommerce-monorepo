import { Injectable } from '@nestjs/common';
import type { IPaymentProvider } from '../interfaces/payment-provider.interface';

@Injectable()
export class PaymentPluginRegistry {
  private readonly providers = new Map<string, IPaymentProvider>();

  register(provider: IPaymentProvider): void {
    this.providers.set(provider.getProviderName(), provider);
  }

  resolve(name: string): IPaymentProvider {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`Payment provider '${name}' not registered`);
    return provider;
  }

  getDefault(): IPaymentProvider {
    return this.resolve(process.env.DEFAULT_PAYMENT_PROVIDER ?? 'stripe');
  }
}
