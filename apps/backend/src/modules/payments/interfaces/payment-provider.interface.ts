export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, string>;
}

export interface PaymentResult {
  intentId: string;
  status: string;
}

export interface RefundResult {
  refundId: string;
  status: string;
}

/*
 - Microkernel core interface — every payment provider must implement this.
 - Adding a new provider (PayPal, Braintree) means implementing this interface
 - and registering it; OrderSagaService is unchanged.
 */
export interface IPaymentProvider {
  getProviderName(): string;
  createPaymentIntent(orderId: string, amount: number, currency: string): Promise<PaymentIntent>;
  isRetriableError(error: unknown): boolean;
}
