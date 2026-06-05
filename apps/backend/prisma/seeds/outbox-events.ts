import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

// Realistic domain event types that the outbox processor would handle
const EVENT_DEFINITIONS = [
  {
    aggregateType: 'Order',
    eventType: 'order.created',
    makePayload: (id: string) => ({ orderId: id, status: 'PENDING', totalPrice: faker.commerce.price() }),
  },
  {
    aggregateType: 'Order',
    eventType: 'order.paid',
    makePayload: (id: string) => ({ orderId: id, paymentIntentId: `pi_${faker.string.alphanumeric(20)}`, paidAt: new Date() }),
  },
  {
    aggregateType: 'Order',
    eventType: 'order.shipped',
    makePayload: (id: string) => ({ orderId: id, trackingNumber: faker.string.alphanumeric(12).toUpperCase() }),
  },
  {
    aggregateType: 'Order',
    eventType: 'order.cancelled',
    makePayload: (id: string) => ({ orderId: id, reason: 'Customer request' }),
  },
  {
    aggregateType: 'Order',
    eventType: 'order.refunded',
    makePayload: (id: string) => ({ orderId: id, refundId: `re_${faker.string.alphanumeric(20)}`, amount: faker.commerce.price() }),
  },
  {
    aggregateType: 'Product',
    eventType: 'product.stock_low',
    makePayload: (id: string) => ({ productId: id, stock: faker.number.int({ min: 1, max: 5 }) }),
  },
  {
    aggregateType: 'Product',
    eventType: 'product.back_in_stock',
    makePayload: (id: string) => ({ productId: id, stock: faker.number.int({ min: 20, max: 100 }) }),
  },
  {
    aggregateType: 'User',
    eventType: 'user.registered',
    makePayload: (id: string) => ({ userId: id, email: faker.internet.email() }),
  },
  {
    aggregateType: 'User',
    eventType: 'user.password_reset_requested',
    makePayload: (id: string) => ({ userId: id, expiresAt: faker.date.soon({ days: 1 }) }),
  },
  {
    aggregateType: 'ReturnRequest',
    eventType: 'return.approved',
    makePayload: (id: string) => ({ returnRequestId: id, refundAmount: faker.commerce.price() }),
  },
  {
    aggregateType: 'ReturnRequest',
    eventType: 'return.rejected',
    makePayload: (id: string) => ({ returnRequestId: id, reason: 'Item not eligible for return' }),
  },
];

// Status distribution: most events are processed, some pending, a few failed
const STATUS_POOL = [
  ...Array(60).fill('PROCESSED'),
  ...Array(20).fill('PENDING'),
  ...Array(10).fill('PROCESSING'),
  ...Array(10).fill('FAILED'),
];

export async function seedOutboxEvents(
  prisma: PrismaClient,
  entityIds: Record<string, string[]>,
): Promise<void> {
  const ENTRIES = 300;
  const events = [];

  for (let i = 0; i < ENTRIES; i++) {
    const def = faker.helpers.arrayElement(EVENT_DEFINITIONS);
    const aggregateId = faker.helpers.arrayElement(entityIds[def.aggregateType] ?? [faker.string.uuid()]);
    const status = faker.helpers.arrayElement(STATUS_POOL) as 'PROCESSED' | 'PENDING' | 'PROCESSING' | 'FAILED';
    const attempts = status === 'FAILED'
      ? faker.number.int({ min: 3, max: 5 })
      : status === 'PROCESSED'
        ? faker.number.int({ min: 1, max: 2 })
        : 0;

    events.push({
      aggregateId,
      aggregateType: def.aggregateType,
      eventType: def.eventType,
      payload: def.makePayload(aggregateId),
      status,
      attempts,
      error: status === 'FAILED' ? 'Connection timeout after 3 retries' : null,
      processedAt: status === 'PROCESSED' ? faker.date.past({ years: 1 }) : null,
      createdAt: faker.date.past({ years: 2 }),
    });
  }

  await prisma.outboxEvent.createMany({ data: events });

  const byStatus = await prisma.outboxEvent.groupBy({
    by: ['status'],
    _count: true,
  });
  const summary = byStatus.map((g) => `${g._count} ${g.status}`).join(', ');
  console.log(`  ✓ ${ENTRIES} outbox events (${summary})`);
}
