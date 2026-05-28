import './tracing';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as http from 'http';
import * as express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { join } from 'path';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

function setupMiddleware(app: NestExpressApplication): void {
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:3000',
    credentials: true,
  });
}

function setupPipes(app: NestExpressApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}

function setupSwagger(app: NestExpressApplication): void {
  const config = new DocumentBuilder()
    .setTitle('E-Commerce Backend API')
    .setDescription('RESTful API for e-commerce platform')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
}

// Graceful shutdown: stop accepting new connections, let in-flight requests finish,
// then allow NestJS lifecycle hooks (onModuleDestroy) to close DB/Redis connections.
// The 10-second timeout forces an exit if teardown hangs — prevents zombie containers.
function setupGracefulShutdown(httpServer: http.Server): void {
  const SHUTDOWN_TIMEOUT_MS = 10_000;

  const onShutdown = (signal: string): void => {
    logger.log(`${signal} received — closing HTTP server`);

    // httpServer.close() stops accepting NEW connections but lets existing
    // requests complete. NestJS's enableShutdownHooks() handles app.close().
    httpServer.close(() => logger.log('HTTP server closed, all connections drained'));

    // Safety net: if teardown takes too long (hung DB query, etc.) force exit
    setTimeout(() => {
      logger.error('Shutdown timed out after 10s — forcing process exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref(); // .unref() so this timer doesn't keep the event loop alive
  };

  process.on('SIGTERM', () => onShutdown('SIGTERM'));
  process.on('SIGINT', () => onShutdown('SIGINT'));
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = process.env.PORT ?? 3000;

  // Raw body parser for Stripe webhooks must be registered before other middleware
  app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

  setupMiddleware(app);
  setupPipes(app);
  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api');
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });
  setupSwagger(app);

  // enableShutdownHooks: NestJS listens for SIGTERM/SIGINT and calls
  // onModuleDestroy on all providers (PrismaService closes DB, RedisHealthIndicator
  // closes its connection, etc.) before the process exits.
  app.enableShutdownHooks();

  await app.listen(port);

  // Get the underlying Node.js http.Server AFTER listen() so we can close it
  setupGracefulShutdown(app.getHttpServer() as http.Server);

  logger.log(`Application started on http://localhost:${port}`);
  logger.log(`API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap().catch((error: unknown) => {
  logger.error('Failed to start application', error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
