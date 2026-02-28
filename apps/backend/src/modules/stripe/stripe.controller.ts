import { Controller, Post, Body, Param, Req, HttpCode, HttpStatus } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import type Stripe from 'stripe';
import { StripeService } from './stripe.service';
import { CreatePaymentIntentDto, PaymentIntentResponseDto } from './dto';
import { Public } from '@/common/decorators';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('create-payment-intent')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a payment intent for an order' })
  @ApiResponse({ status: 201, type: PaymentIntentResponseDto })
  async createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
  ): Promise<PaymentIntentResponseDto> {
    const { orderId } = createPaymentIntentDto;

    const paymentIntent = await this.stripeService.getPaymentIntentByOrderId(orderId);

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || '',
      amount: paymentIntent.amount,
      status: paymentIntent.status,
      orderId,
    };
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({ status: 200 })
  async handleWebhook(@Req() req: RawBodyRequest<Request>): Promise<{ received: boolean }> {
    const sig = req.headers['stripe-signature'] as string;
    const event = this.stripeService.constructWebhookEvent(req.rawBody || Buffer.alloc(0), sig);
    await this.processWebhookEvent(event);
    return { received: true };
  }

  private async processWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.stripeService.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.stripeService.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.refunded':
        await this.stripeService.handleRefundProcessed(event.data.object);
        break;
    }
  }

  @Post('cancel-payment/:paymentIntentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a payment intent' })
  @ApiResponse({ status: 200 })
  async cancelPayment(
    @Param('paymentIntentId') paymentIntentId: string,
  ): Promise<{ message: string }> {
    await this.stripeService.cancelPaymentIntent(paymentIntentId);
    return { message: 'Payment intent cancelled successfully' };
  }
}
