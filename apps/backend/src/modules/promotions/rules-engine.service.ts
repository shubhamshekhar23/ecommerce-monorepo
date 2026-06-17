import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { interpretDsl, EvalContext } from './dsl/interpreter';

export interface CartContext {
  subtotal: number;
  itemCount: number;
  productIds?: string[];
  couponCode?: string;
}

export interface CustomerContext {
  tier: string;
  orderCount: number;
}

interface RuleCondition {
  minOrderValue?: number;
  maxOrderValue?: number;
  customerTier?: string;
  minQuantity?: number;
  isFirstOrder?: boolean;
  productIds?: string[];
  couponCode?: string;
}

export interface AppliedAction {
  ruleId: string;
  ruleName: string;
  type: string;
  value?: number;
  itemId?: string;
}

@Injectable()
export class RulesEngineService {
  private readonly logger = new Logger(RulesEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(
    cart: CartContext,
    customer: CustomerContext,
    tx?: Prisma.TransactionClient,
  ): Promise<AppliedAction[]> {
    const client = tx ?? this.prisma;
    const now = new Date();
    const rules = await client.promotionRule.findMany({
      where: {
        active: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }],
      },
      orderBy: { priority: 'desc' },
    });

    const applied: AppliedAction[] = [];
    for (const rule of rules) {
      const matches = rule.conditionDsl
        ? this.matchesDsl(rule.conditionDsl, cart, customer)
        : this.matchesJson(rule.condition as unknown as RuleCondition, cart, customer);

      if (matches) {
        const action = rule.action as Prisma.JsonObject;
        applied.push({
          ruleId: rule.id,
          ruleName: rule.name,
          type: String(action.type ?? ''),
          value: action.value !== undefined ? Number(action.value) : undefined,
          itemId: action.itemId !== undefined ? String(action.itemId) : undefined,
        });
        if (!rule.stackable) break;
      }
    }

    if (applied.length > 0) {
      this.logger.log(
        `Applied ${applied.length} promotion rule(s): ${applied.map((a) => a.ruleName).join(', ')}`,
      );
    }
    return applied;
  }

  applyToSubtotal(subtotal: number, actions: AppliedAction[]): number {
    let total = subtotal;
    for (const action of actions) {
      if (action.type === 'percentage_discount' && action.value !== undefined) {
        total = total * (1 - action.value / 100);
      } else if (action.type === 'fixed_discount' && action.value !== undefined) {
        total = Math.max(0, total - action.value);
      }
    }
    return parseFloat(total.toFixed(2));
  }

  hasFreeShipping(actions: AppliedAction[]): boolean {
    return actions.some((a) => a.type === 'free_shipping');
  }

  private matchesJson(cond: RuleCondition, cart: CartContext, customer: CustomerContext): boolean {
    if (cond.minOrderValue !== undefined && cart.subtotal < cond.minOrderValue) return false;
    if (cond.maxOrderValue !== undefined && cart.subtotal > cond.maxOrderValue) return false;
    if (cond.customerTier !== undefined && customer.tier !== cond.customerTier) return false;
    if (cond.minQuantity !== undefined && cart.itemCount < cond.minQuantity) return false;
    if (cond.isFirstOrder === true && customer.orderCount > 0) return false;
    if (cond.couponCode !== undefined && cart.couponCode !== cond.couponCode) return false;
    if (cond.productIds?.length && !cond.productIds.some((id) => cart.productIds?.includes(id))) {
      return false;
    }
    return true;
  }

  private matchesDsl(dsl: string, cart: CartContext, customer: CustomerContext): boolean {
    try {
      const ctx: EvalContext = {
        order: { subtotal: cart.subtotal, itemCount: cart.itemCount },
        customer: { tier: customer.tier, orderCount: customer.orderCount },
      };
      return interpretDsl(dsl, ctx) !== null;
    } catch (err) {
      this.logger.warn(`DSL evaluation failed: ${String(err)}`);
      return false;
    }
  }
}
