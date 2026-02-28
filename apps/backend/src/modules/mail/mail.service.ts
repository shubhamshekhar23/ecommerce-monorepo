import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import type { Order } from '@prisma/client';

interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
}

interface ShippingAddress {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface UserLike {
  email: string;
  firstName: string | null;
  lastName?: string | null;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendWelcomeEmail(user: UserLike): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';

    await this.sendEmail(user.email, 'Welcome to ECommerce!', 'welcome', {
      firstName: user.firstName || 'User',
      email: user.email,
      appUrl,
    });
  }

  async sendOrderConfirmation(
    order: Order,
    user: UserLike,
    items: OrderItem[],
    shippingAddress: ShippingAddress,
  ): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';

    await this.sendEmail(user.email, 'Order Confirmation', 'order-confirmation', {
      firstName: user.firstName || 'User',
      orderNumber: order.orderNumber,
      orderDate: new Date(order.createdAt).toLocaleDateString(),
      status: order.status,
      items,
      total: order.totalPrice.toString(),
      shippingAddress,
      appUrl,
    });
  }

  // eslint-disable-next-line max-lines-per-function
  async sendOrderShipped(
    order: Order,
    user: UserLike,
    trackingNumber: string,
    carrier: string,
    shippingAddress: ShippingAddress,
  ): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);
    const trackingUrl = `https://tracking.example.com/${trackingNumber}`;

    await this.sendEmail(user.email, 'Your Order Has Shipped', 'order-shipped', {
      firstName: user.firstName || 'User',
      orderNumber: order.orderNumber,
      trackingNumber,
      carrier,
      estimatedDelivery: estimatedDelivery.toLocaleDateString(),
      shippingAddress,
      trackingUrl,
      appUrl,
    });
  }

  // eslint-disable-next-line max-lines-per-function
  private async sendEmail(
    to: string,
    subject: string,
    template: string,
    context: Record<string, any>,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template,
        context,
      });

      this.logger.log(`Email sent successfully to ${to} with subject: ${subject}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to} with subject: ${subject}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
