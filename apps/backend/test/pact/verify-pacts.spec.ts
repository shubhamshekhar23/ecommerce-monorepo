import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Verifier } from '@pact-foundation/pact';
import { resolve } from 'path';
import { AppModule } from '../../src/app.module';
import { KafkaProducerService } from '../../src/modules/kafka/kafka-producer.service';
import { CircuitBreakerService } from '../../src/modules/circuit-breaker/circuit-breaker.service';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

/*
 - Provider verification: confirms the backend still satisfies every interaction
 - recorded in pacts/frontend-backend.json.
 - Uses the same Testcontainers PostgreSQL + Redis from global-setup.ts (jest-e2e.json).
 - Runs after the consumer test generates the pact file.
 */

describe('Pact provider verification', () => {
  let app: INestApplication;
  let port: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(KafkaProducerService)
      .useValue({ publish: jest.fn().mockResolvedValue(undefined) })
      .overrideProvider(CircuitBreakerService)
      .useValue({ createPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_verify' }) })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    /*
     - Seed a product so the provider state "products exist" returns data.
     */
    await app.init();
    await seedProduct(moduleRef.get(PrismaService));

    await app.listen(0);
    port = (app.getHttpServer().address() as { port: number }).port;
  });

  afterAll(async () => {
    await app.close();
  });

  it('satisfies all frontend consumer expectations', async () => {
    await new Verifier({
      provider: 'backend',
      providerBaseUrl: `http://localhost:${port}`,
      pactUrls: [resolve(__dirname, '../../../pacts/frontend-backend.json')],
      logLevel: 'error',
    }).verifyProvider();
  });
});

async function seedProduct(prisma: PrismaService): Promise<void> {
  const cat = await prisma.category.upsert({
    where: { slug: 'pact-test-cat' },
    create: { name: 'Pact Category', slug: 'pact-test-cat' },
    update: {},
  });
  const product = await prisma.product.upsert({
    where: { slug: 'pact-test-product' },
    create: {
      name: 'Pact Test Product',
      slug: 'pact-test-product',
      price: 9.99,
      categoryId: cat.id,
      isActive: true,
    },
    update: {},
  });
  await prisma.productVariant.upsert({
    where: { sku: 'PACT-001' },
    create: { productId: product.id, sku: 'PACT-001', price: 9.99, stock: 5 },
    update: {},
  });
}
