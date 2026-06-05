import { PrismaClient, Prisma } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { SeededUser } from './users';

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
];

// (action, entity, generates before/after?)
type AuditTemplate = {
  action: string;
  entity: string;
  hasDiff: boolean;
};

const TEMPLATES: AuditTemplate[] = [
  { action: 'USER_LOGIN', entity: 'User', hasDiff: false },
  { action: 'USER_LOGOUT', entity: 'User', hasDiff: false },
  { action: 'USER_LOGIN_FAILED', entity: 'User', hasDiff: false },
  { action: 'USER_CREATED', entity: 'User', hasDiff: false },
  { action: 'USER_UPDATED', entity: 'User', hasDiff: true },
  { action: 'USER_PASSWORD_CHANGED', entity: 'User', hasDiff: false },
  { action: 'USER_DEACTIVATED', entity: 'User', hasDiff: true },
  { action: 'PRODUCT_CREATED', entity: 'Product', hasDiff: false },
  { action: 'PRODUCT_UPDATED', entity: 'Product', hasDiff: true },
  { action: 'PRODUCT_DELETED', entity: 'Product', hasDiff: true },
  { action: 'PRODUCT_STOCK_UPDATED', entity: 'Product', hasDiff: true },
  { action: 'ORDER_CREATED', entity: 'Order', hasDiff: false },
  { action: 'ORDER_STATUS_UPDATED', entity: 'Order', hasDiff: true },
  { action: 'ORDER_CANCELLED', entity: 'Order', hasDiff: true },
  { action: 'ORDER_REFUNDED', entity: 'Order', hasDiff: true },
  { action: 'COUPON_CREATED', entity: 'Coupon', hasDiff: false },
  { action: 'COUPON_UPDATED', entity: 'Coupon', hasDiff: true },
  { action: 'COUPON_DEACTIVATED', entity: 'Coupon', hasDiff: true },
  { action: 'RETURN_APPROVED', entity: 'ReturnRequest', hasDiff: true },
  { action: 'RETURN_REJECTED', entity: 'ReturnRequest', hasDiff: true },
  { action: 'ADMIN_ROLE_ASSIGNED', entity: 'User', hasDiff: true },
];

function makeDiff(entity: string, action: string): { before: object | null; after: object | null } {
  if (action.endsWith('_CREATED')) return { before: null, after: { status: 'active', createdAt: new Date() } };
  if (action.endsWith('_DELETED')) return { before: { status: 'active' }, after: null };
  if (entity === 'User' && action === 'USER_UPDATED') {
    return { before: { firstName: faker.person.firstName() }, after: { firstName: faker.person.firstName() } };
  }
  if (entity === 'Product' && action === 'PRODUCT_STOCK_UPDATED') {
    const prev = faker.number.int({ min: 0, max: 50 });
    return { before: { stock: prev }, after: { stock: prev + faker.number.int({ min: 10, max: 100 }) } };
  }
  if (entity === 'Order') {
    const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
    const idx = faker.number.int({ min: 0, max: statuses.length - 2 });
    return { before: { status: statuses[idx] }, after: { status: statuses[idx + 1] } };
  }
  if (entity === 'Coupon') {
    return { before: { isActive: true, usedCount: faker.number.int({ min: 0, max: 50 }) }, after: { isActive: false } };
  }
  if (entity === 'ReturnRequest') {
    return { before: { status: 'PENDING' }, after: { status: action === 'RETURN_APPROVED' ? 'APPROVED' : 'REJECTED' } };
  }
  return { before: { value: faker.string.alphanumeric(8) }, after: { value: faker.string.alphanumeric(8) } };
}

export async function seedAuditLog(
  prisma: PrismaClient,
  users: SeededUser[],
  entityIds: Record<string, string[]>,
): Promise<void> {
  const ENTRIES = 500;
  const entries = [];

  for (let i = 0; i < ENTRIES; i++) {
    const template = faker.helpers.arrayElement(TEMPLATES);
    const actor = faker.helpers.arrayElement(users);
    const entityId = faker.helpers.arrayElement(entityIds[template.entity] ?? [faker.string.uuid()]);
    const { before, after } = template.hasDiff ? makeDiff(template.entity, template.action) : { before: null, after: null };

    entries.push({
      timestamp: faker.date.past({ years: 2 }),
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.email === 'admin@ecommerce.com' ? 'ADMIN' : 'USER',
      action: template.action,
      entity: template.entity,
      entityId,
      before: before ?? Prisma.JsonNull,
      after: after ?? Prisma.JsonNull,
      ipAddress: faker.internet.ipv4(),
      userAgent: faker.helpers.arrayElement(USER_AGENTS),
    });
  }

  // AuditLog has no Prisma-managed autoincrement — insert one by one to respect append-only semantics
  await prisma.auditLog.createMany({ data: entries });

  console.log(`  ✓ ${ENTRIES} audit log entries`);
}
