import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import configuration from './config/configuration';
import { NotificationModule } from './notification/notification.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // RabbitMQ connection — shared across the whole service.
    // Exchanges are asserted here at startup so the service fails fast if the
    // broker is unavailable. Queues are created by @RabbitSubscribe decorators.
    RabbitMQModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
        exchanges: [
          { name: 'order.events', type: 'topic' },
          { name: 'user.events', type: 'topic' },
        ],
        connectionInitOptions: { wait: true },
      }),
    }),

    MailerModule.forRootAsync({
      useFactory: () => ({
        transport: {
          host: process.env.SMTP_HOST ?? 'localhost',
          port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
          auth:
            process.env.SMTP_USER
              ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
              : undefined,
        },
        defaults: { from: process.env.SMTP_FROM ?? '"ECommerce" <noreply@ecommerce.com>' },
        template: {
          // In dev: src/mail/templates. After nest build: dist/mail/templates
          dir: join(__dirname, 'mail', 'templates'),
          adapter: new HandlebarsAdapter(),
          options: { strict: false },
        },
      }),
    }),

    NotificationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
