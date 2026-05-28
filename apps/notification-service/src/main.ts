import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('NotificationService');

  // This service is purely event-driven — it consumes from RabbitMQ and sends emails.
  // It exposes a minimal HTTP server only for health checks and metrics.
  const port = process.env.PORT ?? 3004;
  await app.listen(port);
  logger.log(`Notification service running on port ${port}`);
}

bootstrap();
