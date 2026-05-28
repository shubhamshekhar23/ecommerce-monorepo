import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { EXCHANGES, ROUTING_KEYS } from '@ecommerce/shared-types';
import type { UserRegisteredEvent } from '@ecommerce/shared-types';

@Injectable()
export class UserConsumer {
  private readonly logger = new Logger(UserConsumer.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly config: ConfigService,
  ) {}

  @RabbitSubscribe({
    exchange: EXCHANGES.USER,
    routingKey: ROUTING_KEYS.USER.REGISTERED,
    queue: 'notification.user.registered',
    queueOptions: { durable: true },
  })
  async handleUserRegistered(event: UserRegisteredEvent): Promise<void | Nack> {
    this.logger.log(`User registered event: userId=${event.userId} email=${event.email}`);

    try {
      await this.mailerService.sendMail({
        to: event.email,
        subject: 'Welcome to ECommerce!',
        template: 'welcome',
        context: {
          firstName: event.firstName || 'User',
          email: event.email,
          appUrl: this.config.get('app.url'),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send welcome email: userId=${event.userId}`, error);
      return new Nack(false);
    }
  }
}
