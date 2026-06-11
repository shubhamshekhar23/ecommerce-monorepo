import './tracing';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));

  /*
   - This service is purely event-driven — it consumes from RabbitMQ and sends emails.
   - It exposes a minimal HTTP server only for health checks and metrics.
   */
  const port = process.env.PORT ?? 3004;
  await app.listen(port);
  app.get(PinoLogger).log(`Notification service running on port ${port}`, 'Bootstrap');
}

bootstrap();
