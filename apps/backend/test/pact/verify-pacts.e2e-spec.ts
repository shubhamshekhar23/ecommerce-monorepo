import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Verifier } from '@pact-foundation/pact';
import * as jwt from 'jsonwebtoken';
import { resolve } from 'path';
import { AppModule } from '../../src/app.module';
import { KafkaProducerService } from '../../src/modules/kafka/kafka-producer.service';
import { CircuitBreakerService } from '../../src/modules/circuit-breaker/circuit-breaker.service';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

/*
 - Provider verification: confirms the backend satisfies every interaction in
 - pacts/frontend-backend.json. Uses Testcontainers PostgreSQL + Redis from global-setup.ts.
 */

const PACT_USER_ID = 'clusr123';
const PACT_ORDER_ID = 'clord123';
const PACT_PRODUCT_ID = 'clprod123';
const PACT_VARIANT_ID = 'clvar001';
const PACT_CAT_ID = 'clcat456';

function signPactToken(): string {
  const privateKey = (process.env.TEST_JWT_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');
  return jwt.sign(
    { sub: PACT_USER_ID, email: 'pact@test.com', role: 'USER', type: 'access' },
    privateKey,
    { algorithm: 'RS256', expiresIn: '1h' },
  );
}

async function ensureBaseData(prisma: PrismaService): Promise<void> {
  await prisma.category.upsert({
    where: { id: PACT_CAT_ID },
    create: { id: PACT_CAT_ID, name: 'Pact Category', slug: 'pact-cat' },
    update: {},
  });
  await prisma.product.upsert({
    where: { id: PACT_PRODUCT_ID },
    create: {
      id: PACT_PRODUCT_ID,
      name: 'Pact Test Product',
      slug: 'pact-test-product',
      categoryId: PACT_CAT_ID,
      isActive: true,
    },
    update: {},
  });
  await prisma.productVariant.upsert({
    where: { id: PACT_VARIANT_ID },
    create: {
      id: PACT_VARIANT_ID,
      productId: PACT_PRODUCT_ID,
      sku: 'PACT-001',
      price: 9.99,
      cost: 0,
      stock: 10,
    },
    update: {},
  });
  await prisma.user.upsert({
    where: { id: PACT_USER_ID },
    create: {
      id: PACT_USER_ID,
      email: 'pact@test.com',
      password: 'hashed',
      firstName: 'Pact',
      lastName: 'User',
    },
    update: {},
  });
}

async function ensureOrderState(prisma: PrismaService): Promise<void> {
  await ensureBaseData(prisma);
  const order = await prisma.order.upsert({
    where: { id: PACT_ORDER_ID },
    create: {
      id: PACT_ORDER_ID,
      userId: PACT_USER_ID,
      orderNumber: 'ORD-2026-001',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      totalPrice: 24.99,
    },
    update: {},
  });
  await prisma.orderItem.upsert({
    where: { id: 'cloi123' },
    create: {
      id: 'cloi123',
      orderId: order.id,
      productId: PACT_PRODUCT_ID,
      variantId: PACT_VARIANT_ID,
      quantity: 1,
      price: 24.99,
    },
    update: {},
  });
}

async function ensureCartState(prisma: PrismaService): Promise<void> {
  await ensureBaseData(prisma);
  const cart = await prisma.cart.upsert({
    where: { userId: PACT_USER_ID },
    create: { userId: PACT_USER_ID },
    update: {},
  });
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId: PACT_VARIANT_ID } },
  });
  if (!existing) {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: PACT_PRODUCT_ID,
        variantId: PACT_VARIANT_ID,
        quantity: 1,
      },
    });
  }
}

// eslint-disable-next-line max-lines-per-function
describe('Pact provider verification', () => {
  let app: INestApplication;
  let port: number;
  let prisma: PrismaService;

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

    await app.init();
    prisma = moduleRef.get(PrismaService);
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
      pactUrls: [resolve(__dirname, '../../../../pacts/frontend-backend.json')],
      logLevel: 'error',
      requestFilter: (req, _res, next) => {
        if (req.headers['authorization']) {
          req.headers['authorization'] = `Bearer ${signPactToken()}`;
        }
        next();
      },
      stateHandlers: {
        'order clord123 exists and belongs to user clusr123': () => ensureOrderState(prisma),
        'user clusr123 has at least one order': () => ensureOrderState(prisma),
        'user clusr123 has a non-empty cart': () => ensureCartState(prisma),
        'product clprod123 exists and is in stock': () => ensureBaseData(prisma),
        'products exist': () => ensureBaseData(prisma),
      },
    }).verifyProvider();
  });
});
