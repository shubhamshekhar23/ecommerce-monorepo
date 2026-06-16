import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import type { App } from 'supertest/types';
import { UserRole } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { KafkaProducerService } from '../src/modules/kafka/kafka-producer.service';
import { CircuitBreakerService } from '../src/modules/circuit-breaker/circuit-breaker.service';
import { hashPassword } from '../src/common/utils/password.util';

/*
 - E2E user journey: seed user/product → authenticate → browse products → add to cart → place order.
 - PostgreSQL and Redis are provided by Testcontainers (see test/global-setup.ts).
 - KafkaProducerService and CircuitBreakerService are mocked so neither Kafka nor
 - Stripe need to be running during local or CI test execution.
 */

const mockKafka = { publish: jest.fn().mockResolvedValue(undefined) };
const mockCircuitBreaker = {
  createPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_test_abc123' }),
};

function signTestJwt(userId: string, role: UserRole): string {
  const privateKey = (process.env.TEST_JWT_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');
  const svc = new JwtService({
    privateKey,
    signOptions: { algorithm: 'RS256', expiresIn: '1h' },
  });
  return svc.sign({ sub: userId, email: 'journey@test.com', role, type: 'access' });
}

describe('User journey (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let userId: string;
  let productId: string;
  let variantId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(KafkaProducerService)
      .useValue(mockKafka)
      .overrideProvider(CircuitBreakerService)
      .useValue(mockCircuitBreaker)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    prisma = moduleRef.get(PrismaService);
    await seedTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedTestData(): Promise<void> {
    const category = await prisma.category.create({
      data: { name: 'Electronics', slug: 'electronics' },
    });

    const product = await prisma.product.create({
      data: {
        name: 'Test Laptop',
        slug: 'test-laptop',
        price: 999.99,
        categoryId: category.id,
        isActive: true,
      },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: { productId: product.id, sku: 'LAPTOP-001', price: 999.99, stock: 10 },
    });
    variantId = variant.id;

    const user = await prisma.user.create({
      data: {
        email: 'journey@test.com',
        password: await hashPassword('Password123!'),
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        role: UserRole.CUSTOMER,
        addresses: {
          create: {
            firstName: 'Test',
            lastName: 'User',
            line1: '1 Main St',
            city: 'San Francisco',
            state: 'CA',
            country: 'US',
            postalCode: '94105',
            isDefault: true,
          },
        },
      },
    });
    userId = user.id;
  }

  it('GET /products — lists products with avgRating and reviewCount', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/products').expect(200);

    expect(res.body.data).toBeInstanceOf(Array);
    const product = (res.body.data as any[]).find((p) => p.id === productId);
    expect(product).toBeDefined();
    expect(product).toHaveProperty('avgRating');
    expect(product).toHaveProperty('reviewCount');
  });

  it('POST /cart/items — adds product to cart', async () => {
    const token = signTestJwt(userId, UserRole.CUSTOMER);

    const res = await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, variantId, quantity: 1 })
      .expect(201);

    expect(res.body).toHaveProperty('id');
  });

  it('POST /orders — creates order, decrements stock, writes event log', async () => {
    const token = signTestJwt(userId, UserRole.CUSTOMER);

    const res = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('PENDING');
    expect(res.body.items).toHaveLength(1);

    /*
     - Business side effects verified directly against the DB (not just the HTTP response).
     */
    const [variant, order, events] = await Promise.all([
      prisma.productVariant.findUnique({ where: { id: variantId } }),
      prisma.order.findUnique({ where: { id: res.body.id as string } }),
      prisma.orderEvent.findMany({ where: { orderId: res.body.id as string } }),
    ]);

    expect(variant?.stock).toBe(9);
    expect(order).not.toBeNull();
    expect(order?.userId).toBe(userId);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].type).toBe('ORDER_CREATED');
  });
});
