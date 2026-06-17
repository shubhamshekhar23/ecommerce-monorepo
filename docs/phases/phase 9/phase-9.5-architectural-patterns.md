# Phase 9.5 — Advanced Architectural Patterns

**Status:** ✅ Done
**Builds on:** [Phase 9 — Microservices Extraction](./phase-9-microservices.md), [Phase 9.4 — Event Architecture](./phase-9.4-event-architecture.md)
**Concept cluster:** Three deep architectural refactors of existing modules — evolve the OrderEvent log into true Event Sourcing, restructure payment providers as swappable Microkernel plugins, and decompose the OrderSagaService into a testable Pipe and Filter pipeline.

These are the most effort-intensive items in the entire V3 sequence. Each refactors a core module rather than adding a new one. Do them in order — Event Sourcing first (establishes the event foundation), then Microkernel (restructures payments), then Pipe and Filter (restructures the saga that uses both).

---

## True Event Sourcing (evolve existing OrderEvent)

**What:** Make the `OrderEvent` append-only log the single source of truth for order state. Current state is computed by replaying events — the mutable `Order.status` column becomes a denormalized read cache, not the authoritative record.

**Current state:** `OrderEventStore` exists and events are appended (V1 item 32). But `Order.status` is still updated directly via `prisma.order.update({ data: { status: 'PAID' } })`. The events are supplemental audit data.

**True Event Sourcing:** Events are written first. Reads derive state by folding over events. The `status` column is updated as a side-effect of projection, not as the primary write.

**Why full ES matters:**

- **Audit:** Every state transition is recorded with its timestamp and payload. You cannot have a mystery `CANCELLED` order with no trace of how it got there.
- **Replay:** Rebuild any derived state by replaying events. Add a new field to the projection? Replay from event 0.
- **Time travel:** Query what the order looked like at any point in its history.
- **Alternate projections:** The same event stream can feed multiple read models — order status, order analytics, warehouse fulfillment view — independently.

**Event types for Order:**

```typescript
type OrderEventType =
  | 'ORDER_CREATED'      // order row inserted, items reserved
  | 'PAYMENT_INITIATED'  // Stripe PaymentIntent created
  | 'ORDER_PAID'         // payment confirmed
  | 'ORDER_PROCESSING'   // fulfillment started
  | 'ORDER_SHIPPED'      // tracking number assigned
  | 'ORDER_DELIVERED'    // delivery confirmed
  | 'ORDER_CANCELLED'    // compensation completed
  | 'REFUND_INITIATED'   // refund requested
  | 'REFUND_COMPLETED';  // refund settled
```

**Projection service:**

```typescript
@Injectable()
export class OrderProjectionService {
  async project(orderId: string): Promise<OrderState> {
    const events = await this.orderEventStore.getEvents(orderId);
    return events.reduce(this.applyEvent, this.initialState());
  }

  private applyEvent(state: OrderState, event: OrderEvent): OrderState {
    switch (event.type) {
      case 'ORDER_CREATED':    return { ...state, status: 'PENDING',    ...event.payload };
      case 'ORDER_PAID':       return { ...state, status: 'PAID' };
      case 'ORDER_PROCESSING': return { ...state, status: 'PROCESSING' };
      case 'ORDER_SHIPPED':    return { ...state, status: 'SHIPPED',    trackingNumber: event.payload.trackingNumber };
      case 'ORDER_CANCELLED':  return { ...state, status: 'CANCELLED',  cancelReason: event.payload.reason };
      default:                 return state;
    }
  }

  private initialState(): OrderState {
    return { status: 'PENDING', items: [], totalPrice: 0 };
  }
}
```

**Snapshot support** (prevents full replay on every read):

After every 10 events, persist a snapshot:
```prisma
model OrderSnapshot {
  id        String   @id @default(cuid())
  orderId   String   @unique
  state     Json     // serialised OrderState
  eventSeq  Int      // event count at snapshot time
  createdAt DateTime @default(now())
}
```

Projection checks for a snapshot first, then replays only events newer than it.

**Migration path (non-breaking):**
1. Add `OrderProjectionService` — reads run through it, write path unchanged initially
2. Route `OrdersService.findOne()` through the projection
3. Keep `Order.status` column — update it as a side effect after each `OrderEventStore.append()` call
4. Once all reads are projection-based, `Order.status` becomes the cache (updated reactively, not written directly)

**Key files:**
- `apps/backend/src/modules/orders/order-projection.service.ts` — new projection service
- `apps/backend/prisma/schema.prisma` — add `OrderSnapshot` model
- `apps/backend/prisma/migrations/<timestamp>_order_snapshot/migration.sql`
- `apps/backend/src/modules/orders/orders.service.ts` — route reads through projection
- `apps/backend/src/modules/orders/saga/order-saga.service.ts` — ensure all state changes go through `OrderEventStore.append()` first

---

## Microkernel Pattern — Payment Provider Plugins

**What:** Replace the hardwired Stripe dependency in `CircuitBreakerService` with a plugin registry. Each payment provider implements a common `IPaymentProvider` interface and is registered as a named plugin. Adding PayPal or Braintree means implementing the interface and registering — no changes to `OrderSagaService`.

**Why:** The current architecture has `OrderSagaService` → `CircuitBreakerService` → Stripe SDK. The provider is baked in. Swapping providers for different regions, adding a backup provider for failover, or A/B testing two gateways requires forking the service class. The Microkernel pattern makes the core (charge, capture, refund) stable while providers are swappable plugs.

**Core interface:**

```typescript
interface IPaymentProvider {
  getProviderName(): string;
  createPaymentIntent(amount: number, currency: string, metadata: Record<string, string>): Promise<PaymentIntent>;
  capturePayment(paymentIntentId: string): Promise<PaymentResult>;
  refund(paymentIntentId: string, amount?: number): Promise<RefundResult>;
  isRetriableError(error: unknown): boolean;
}
```

**Plugin registry:**

```typescript
@Injectable()
export class PaymentPluginRegistry {
  private readonly providers = new Map<string, IPaymentProvider>();

  register(provider: IPaymentProvider): void {
    this.providers.set(provider.getProviderName(), provider);
  }

  resolve(name: string): IPaymentProvider {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`Payment provider '${name}' not registered`);
    return provider;
  }

  getDefault(): IPaymentProvider {
    return this.resolve(process.env.DEFAULT_PAYMENT_PROVIDER ?? 'stripe');
  }
}
```

**Stripe plugin** (wraps existing logic):

```typescript
@Injectable()
export class StripeProvider implements IPaymentProvider {
  constructor(private readonly stripe: Stripe) {}

  getProviderName(): string { return 'stripe'; }

  async createPaymentIntent(amount: number, currency: string, metadata: Record<string, string>) {
    return this.stripe.paymentIntents.create({ amount, currency, metadata });
  }

  isRetriableError(error: unknown): boolean {
    return isRetriableStripeError(error); // existing util
  }
  // ... capture, refund
}
```

**PaymentService** (replaces CircuitBreakerService as the public facade):

```typescript
@Injectable()
export class PaymentService {
  constructor(
    private readonly registry: PaymentPluginRegistry,
    private readonly circuitBreaker: CircuitBreakerService, // still wraps the active provider
  ) {}

  async charge(amount: number, currency: string, metadata: Record<string, string>) {
    const provider = this.registry.getDefault();
    return this.circuitBreaker.execute(() => provider.createPaymentIntent(amount, currency, metadata));
  }
}
```

**Adding a second provider:**

```typescript
@Injectable()
export class PayPalProvider implements IPaymentProvider {
  getProviderName() { return 'paypal'; }
  // ... implement interface
}
```

Register both in `PaymentsModule` and switch via `DEFAULT_PAYMENT_PROVIDER=paypal` env var — zero code change in `OrderSagaService`.

**Key files:**
- `apps/backend/src/modules/payments/interfaces/payment-provider.interface.ts` — `IPaymentProvider`
- `apps/backend/src/modules/payments/registry/payment-plugin.registry.ts`
- `apps/backend/src/modules/payments/providers/stripe.provider.ts` — wraps existing logic
- `apps/backend/src/modules/payments/payment.service.ts` — public facade
- `apps/backend/src/modules/payments/payments.module.ts` — register providers
- `apps/backend/src/modules/orders/saga/order-saga.service.ts` — inject `PaymentService` instead of `CircuitBreakerService` directly

---

## Pipe and Filter — Order Processing Pipeline

**What:** Decompose `OrderSagaService.runOrderTransaction()` from one large imperative method into a sequential pipeline of independent, named filters. Each filter has a single responsibility, receives an `OrderContext`, and returns a mutated context or throws.

**Why:** `OrderSagaService` is currently the largest service in the codebase. It validates the order, checks inventory, applies discounts, calculates tax, charges payment, creates order rows, emits events, and sends notifications — in one method. This makes it:
- Hard to unit-test (you must mock 8+ dependencies per test)
- Hard to reorder steps without careful analysis
- Hard to add a new step without touching the core method
- Hard to understand at a glance

A pipeline makes each step independently testable, reorderable, and nameable.

**Pipeline context:**

```typescript
interface OrderContext {
  // Input
  userId:      string;
  addressId:   string;
  items:       Array<{ variantId: string; quantity: number }>;
  couponCode?: string;

  // Populated by filters as pipeline progresses
  variants?:   ProductVariant[];
  address?:    Address;
  subtotal?:   number;
  discount?:   number;
  tax?:        number;
  totalPrice?: number;
  order?:      Order;
  paymentIntentId?: string;
}
```

**Filter interface:**

```typescript
interface IOrderFilter {
  name: string;
  execute(ctx: OrderContext, tx: Prisma.TransactionClient): Promise<OrderContext>;
}
```

**Pipeline:**

```typescript
@Injectable()
export class OrderProcessingPipeline {
  private readonly filters: IOrderFilter[] = [
    new ValidateInputFilter(),       // validate addressId, items exist, quantities > 0
    new ResolveVariantsFilter(),     // load ProductVariant rows, check isActive
    new CheckInventoryFilter(),      // verify stock >= requested quantity
    new ApplyDiscountsFilter(),      // call RulesEngineService, compute discount
    new CalculateTaxFilter(),        // call TaxService
    new ComputeTotalsFilter(),       // subtotal + discount + tax = totalPrice
    new ChargePaymentFilter(),       // call PaymentService (Microkernel)
    new CreateOrderFilter(),         // insert Order + OrderItem rows
    new ReserveInventoryFilter(),    // decrement variant stock
    new AppendEventsFilter(),        // OrderEventStore.append ORDER_CREATED
    new EmitIntegrationFilter(),     // publish to RabbitMQ outbox
  ];

  async execute(ctx: OrderContext, tx: Prisma.TransactionClient): Promise<OrderContext> {
    let current = ctx;
    for (const filter of this.filters) {
      current = await filter.execute(current, tx);
    }
    return current;
  }
}
```

**Compensation:** Each filter that makes an external side effect (`ChargePaymentFilter`, `ReserveInventoryFilter`) registers a rollback function on the context. If a later filter throws, the pipeline runner calls registered rollbacks in reverse order — same guarantee as the current `compensate()` method but explicit and per-filter.

**Testing benefit:** Each filter is a class with one `execute()` method. Unit tests mock only what that filter uses:

```typescript
describe('CheckInventoryFilter', () => {
  it('throws InsufficientStockException when stock is 0', async () => {
    const ctx = buildCtx({ variants: [{ stock: 0, quantity: 1 }] });
    await expect(filter.execute(ctx, mockTx)).rejects.toThrow(InsufficientStockException);
  });
});
```

**Key files:**
- `apps/backend/src/modules/orders/pipeline/order-processing.pipeline.ts`
- `apps/backend/src/modules/orders/pipeline/filters/validate-input.filter.ts`
- `apps/backend/src/modules/orders/pipeline/filters/check-inventory.filter.ts`
- `apps/backend/src/modules/orders/pipeline/filters/apply-discounts.filter.ts`
- `apps/backend/src/modules/orders/pipeline/filters/calculate-tax.filter.ts`
- `apps/backend/src/modules/orders/pipeline/filters/charge-payment.filter.ts`
- `apps/backend/src/modules/orders/pipeline/filters/create-order.filter.ts`
- `apps/backend/src/modules/orders/pipeline/filters/append-events.filter.ts`
- `apps/backend/src/modules/orders/pipeline/filters/emit-integration.filter.ts`
- `apps/backend/src/modules/orders/pipeline/interfaces/order-filter.interface.ts`
- `apps/backend/src/modules/orders/pipeline/interfaces/order-context.interface.ts`
- `apps/backend/src/modules/orders/saga/order-saga.service.ts` — reduced to `pipeline.execute(ctx, tx)` call
