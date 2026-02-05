import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

function setupMiddleware(app: any): void {
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:3000',
    credentials: true,
  });
}

function setupPipes(app: any): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
}

function setupSwagger(app: any): void {
  const config = new DocumentBuilder()
    .setTitle('E-Commerce Backend API')
    .setDescription('RESTful API for e-commerce platform')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;

  setupMiddleware(app);
  setupPipes(app);
  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api');
  setupSwagger(app);

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`✅ Application started on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
