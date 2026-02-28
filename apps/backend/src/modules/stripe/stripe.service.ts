import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class StripeService {
  private stripe?: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey && stripeKey.startsWith('sk_')) {
      this.stripe = new Stripe(stripeKey);
    } else {
      this.logger.warn('Stripe API key not configured. Stripe features will be disabled.');
    }
  }

  async createPaymentIntent(orderId: string, amount: number): Promise<Stripe.PaymentIntent> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured. Payment processing is unavailable.');
    }
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      metadata: { orderId },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentIntentId: paymentIntent.id },
    });

    this.logger.log(
      `Payment intent created: paymentIntentId=${paymentIntent.id}, orderId=${orderId}, amount=${amount}`,
    );
    return paymentIntent;
  }

  async confirmPayment(paymentIntentId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { paymentIntentId },
    });
    if (!order) {
      throw new NotFoundException('Order not found for this payment intent');
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: PaymentStatus.SUCCEEDED,
        paidAt: new Date(),
      },
    });

    this.logger.log(`Payment confirmed: orderId=${order.id}, paymentIntentId=${paymentIntentId}`);
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<void> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured.');
    }
    await this.stripe.paymentIntents.cancel(paymentIntentId);

    await this.prisma.order.updateMany({
      where: { paymentIntentId },
      data: { paymentStatus: PaymentStatus.CANCELED },
    });

    this.logger.log(`Payment intent cancelled: paymentIntentId=${paymentIntentId}`);
  }

  async createRefund(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured.');
    }
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };
    if (amount) {
      refundParams.amount = Math.round(amount * 100);
    }

    return this.stripe.refunds.create(refundParams);
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured.');
    }
    const secret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
      this.logger.log(`Webhook received: eventType=${event.type}, eventId=${event.id}`);
      return event;
    } catch (error) {
      this.logger.error(
        `Webhook signature validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const orderId = paymentIntent.metadata?.orderId as string;
    if (!orderId) {
      throw new BadRequestException('Order ID not found in payment metadata');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.SUCCEEDED,
        paidAt: new Date(),
      },
    });

    this.logger.log(`Payment succeeded: orderId=${orderId}, paymentIntentId=${paymentIntent.id}`);
  }

  async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const orderId = paymentIntent.metadata?.orderId as string;
    if (!orderId) return;

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatus.FAILED },
    });

    this.logger.warn(
      `Payment failed: orderId=${orderId}, paymentIntentId=${paymentIntent.id}, lastError=${paymentIntent.last_payment_error?.message || 'unknown'}`,
    );
  }

  async handleRefundProcessed(data: unknown): Promise<void> {
    const refund = data as Stripe.Refund;
    const order = await this.prisma.order.findUnique({
      where: { paymentIntentId: refund.payment_intent as string },
    });
    if (!order) return;

    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: PaymentStatus.REFUNDED },
    });

    this.logger.log(
      `Refund processed: orderId=${order.id}, refundId=${refund.id}, amount=${refund.amount}`,
    );
  }

  async getPaymentIntentByOrderId(orderId: string): Promise<Stripe.PaymentIntent> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured.');
    }
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order?.paymentIntentId) {
      throw new NotFoundException('Payment intent not found for this order');
    }

    this.logger.log(
      `Retrieved payment intent: orderId=${orderId}, paymentIntentId=${order.paymentIntentId}`,
    );
    return this.stripe.paymentIntents.retrieve(order.paymentIntentId);
  }
}
