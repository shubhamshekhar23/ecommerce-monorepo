# Phase 7.4 — Business Rules Engine

**Status:** ✅ Done
**Builds on:** [Phase 7 — Core Feature Backfill](./phase-7-features.md)
**Concept cluster:** Two tightly coupled items — a Rule-Based Architecture that externalises promotion and discount logic into a DB-driven engine, and an Interpreter/DSL that gives the engine a human-readable expression language. Build the engine first; the DSL is the natural next layer on top.

---

## Rule-Based Architecture — Promotions Engine

**What:** Replace hardcoded discount and promotion conditionals in `CouponService` with a database-driven rules engine. Rules are stored as data, evaluated at runtime, and can be changed by admins without a deployment.

**Why:** Current discount logic is a series of `if/else` blocks in `CouponService` — a new promotion type requires a code change, a PR review, and a deployment. Real e-commerce systems run dozens of concurrent promotions with complex stacking rules. Externalising the rules means a marketing team can create "20% off electronics for GOLD members over $100" without involving engineering.

**Rule anatomy:**

Every promotion rule has three parts:
- **Condition** — when does this rule apply? (evaluated against the cart + customer context)
- **Action** — what happens when it applies? (applied to the cart)
- **Priority** — which rule wins when multiple conditions match?

**Schema:**

```prisma
model PromotionRule {
  id          String   @id @default(cuid())
  name        String
  description String?
  condition   Json     // structured condition object
  action      Json     // structured action object
  priority    Int      @default(0)
  active      Boolean  @default(true)
  startsAt    DateTime?
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([active, priority])
}
```

**Condition schema (JSON):**

```typescript
interface RuleCondition {
  minOrderValue?:   number;        // cart subtotal >= N
  maxOrderValue?:   number;        // cart subtotal <= N
  customerTier?:    string;        // 'FREE' | 'SILVER' | 'GOLD'
  productCategory?: string;        // categoryId or category name
  productIds?:      string[];      // specific product IDs
  minQuantity?:     number;        // total item count >= N
  isFirstOrder?:    boolean;       // customer has no previous orders
  couponCode?:      string;        // requires specific coupon code
}
```

**Action schema (JSON):**

```typescript
interface RuleAction {
  type:       'percentage_discount' | 'fixed_discount' | 'free_shipping' | 'free_item';
  value?:     number;    // percentage (0–100) or fixed amount in cents
  itemId?:    string;    // for free_item: which product to add
  maxUses?:   number;    // cap total uses of this rule
}
```

**Rules engine service:**

```typescript
@Injectable()
export class RulesEngineService {
  async evaluate(cart: CartContext, customer: CustomerContext): Promise<AppliedAction[]> {
    const rules = await this.prisma.promotionRule.findMany({
      where: {
        active: true,
        OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] }],
      },
      orderBy: { priority: 'desc' },
    });

    const applied: AppliedAction[] = [];
    for (const rule of rules) {
      if (this.matchesCondition(rule.condition as RuleCondition, cart, customer)) {
        applied.push(rule.action as RuleAction);
      }
    }
    return applied;
  }

  private matchesCondition(cond: RuleCondition, cart: CartContext, customer: CustomerContext): boolean {
    if (cond.minOrderValue !== undefined && cart.subtotal < cond.minOrderValue) return false;
    if (cond.maxOrderValue !== undefined && cart.subtotal > cond.maxOrderValue) return false;
    if (cond.customerTier  !== undefined && customer.tier !== cond.customerTier)  return false;
    if (cond.isFirstOrder  !== undefined && customer.orderCount > 0)              return false;
    // ... remaining condition checks
    return true;
  }
}
```

**Stacking rules:** By default all matching rules apply (additive). Add a `stackable: boolean` field to `PromotionRule` and short-circuit after the first non-stackable match if desired.

**Admin endpoints:**
- `GET  /admin/promotion-rules` — list all rules with pagination
- `POST /admin/promotion-rules` — create a rule
- `PATCH /admin/promotion-rules/:id` — update condition/action/priority
- `DELETE /admin/promotion-rules/:id` — soft-delete the rule (set `active: false`)

**Integration point:**
Call `rulesEngineService.evaluate(cart, customer)` in `CartService.calculateTotals()` and `OrderSagaService` before charging payment. Applied actions reduce `totalPrice` or add a `freeShipping` flag.

**Key files:**
- `apps/backend/prisma/schema.prisma` — add `PromotionRule` model
- `apps/backend/prisma/migrations/<timestamp>_promotion_rules/migration.sql`
- `apps/backend/src/modules/promotions/rules-engine.service.ts` — new service
- `apps/backend/src/modules/promotions/promotions.module.ts`
- `apps/backend/src/modules/promotions/promotions.controller.ts` — admin CRUD
- `apps/backend/src/modules/promotions/dto/` — create/update DTOs
- `apps/backend/src/modules/cart/cart.service.ts` — call rules engine in `calculateTotals`
- `apps/backend/src/modules/orders/saga/order-saga.service.ts` — apply actions before payment

---

## Interpreter Pattern — Discount Rule DSL

**What:** Add a human-readable expression language on top of the rule engine so non-engineers can write conditions without editing JSON. Rules like `IF order.subtotal > 100 AND customer.tier == "GOLD" THEN discount(percentage: 15)` are parsed into an AST and evaluated against the cart context.

**Why:** The JSON condition schema (item above) requires knowing the exact field names and structure. A DSL makes rules writable by product managers and marketing teams without JSON knowledge. It also teaches fundamental compiler concepts — lexing, parsing, AST construction, and tree evaluation.

**This item depends on the rule engine above.** The DSL is a front-end to the same `RulesEngineService` — it compiles DSL strings into the same JSON condition/action format, or evaluates them directly.

**DSL grammar (simplified EBNF):**

```
rule       ::= "IF" condition "THEN" action
condition  ::= expr (("AND" | "OR") expr)*
expr       ::= field operator value
field      ::= "order.subtotal" | "order.itemCount" | "customer.tier" | "customer.orderCount"
operator   ::= ">" | "<" | ">=" | "<=" | "==" | "!="
value      ::= NUMBER | STRING
action     ::= "discount(percentage:" NUMBER ")"
             | "discount(fixed:" NUMBER ")"
             | "free_shipping()"
             | "free_item(id:" STRING ")"
```

**Example rules:**

```
IF order.subtotal > 100 AND customer.tier == "GOLD" THEN discount(percentage: 15)
IF order.itemCount >= 5 THEN discount(fixed: 10)
IF customer.orderCount == 0 THEN discount(percentage: 10)
IF order.subtotal > 50 THEN free_shipping()
```

**Implementation — three layers:**

**1. Lexer** — tokenises the input string:
```typescript
type TokenType = 'IF' | 'THEN' | 'AND' | 'OR' | 'IDENT' | 'NUMBER' | 'STRING' | 'OP' | 'LPAREN' | 'RPAREN';

function tokenise(input: string): Token[] { /* regex-based scan */ }
```

**2. Parser** — builds an AST from the token stream:
```typescript
interface BinaryExpr  { type: 'binary';  op: string; left: AstNode; right: AstNode; }
interface Comparison  { type: 'compare'; op: string; field: string; value: string | number; }
interface ActionNode  { type: 'action';  name: string; args: Record<string, unknown>; }
interface RuleNode    { type: 'rule';    condition: AstNode; action: ActionNode; }

function parse(tokens: Token[]): RuleNode { /* recursive descent parser */ }
```

**3. Interpreter** — evaluates the AST against a `CartContext`:
```typescript
function evaluate(node: AstNode, ctx: EvalContext): boolean | number | string {
  switch (node.type) {
    case 'binary':  return evalBinary(node, ctx);
    case 'compare': return evalComparison(node, ctx);
    // ...
  }
}
```

**Storage:** Add `conditionDsl String?` to `PromotionRule`. When a DSL string is present, `RulesEngineService` compiles it to the JSON condition at save time and stores both — the JSON for fast evaluation, the DSL for human display and editing. Backwards compatible with existing JSON-only rules.

**Key files:**
- `apps/backend/src/modules/promotions/dsl/lexer.ts` — tokeniser
- `apps/backend/src/modules/promotions/dsl/parser.ts` — recursive descent parser
- `apps/backend/src/modules/promotions/dsl/interpreter.ts` — AST evaluator
- `apps/backend/src/modules/promotions/dsl/compiler.ts` — DSL string → JSON condition (for storage)
- `apps/backend/src/modules/promotions/dsl/index.ts` — public interface
- `apps/backend/prisma/schema.prisma` — add `conditionDsl String?` to `PromotionRule`
- `apps/backend/src/modules/promotions/rules-engine.service.ts` — call DSL interpreter when `conditionDsl` present
