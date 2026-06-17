import { parseDsl, ConditionNode, CompareNode, BinaryNode, RuleNode } from './parser';

export interface EvalContext {
  order: { subtotal: number; itemCount: number };
  customer: { tier: string; orderCount: number };
}

export interface DslAppliedAction {
  type: string;
  args: Record<string, string | number>;
}

function evalCompare(node: CompareNode, ctx: EvalContext): boolean {
  const fieldMap: Record<string, unknown> = {
    'order.subtotal': ctx.order.subtotal,
    'order.itemCount': ctx.order.itemCount,
    'customer.tier': ctx.customer.tier,
    'customer.orderCount': ctx.customer.orderCount,
  };
  const fieldVal = fieldMap[node.field];
  if (fieldVal === undefined) throw new Error(`Unknown field: ${node.field}`);

  switch (node.op) {
    case '>':
      return (fieldVal as number) > (node.value as number);
    case '<':
      return (fieldVal as number) < (node.value as number);
    case '>=':
      return (fieldVal as number) >= (node.value as number);
    case '<=':
      return (fieldVal as number) <= (node.value as number);
    case '==':
      return fieldVal == node.value;
    case '!=':
      return fieldVal != node.value;
    default:
      throw new Error(`Unknown operator: ${node.op}`);
  }
}

function evalCondition(node: ConditionNode, ctx: EvalContext): boolean {
  if (node.type === 'compare') return evalCompare(node, ctx);
  const bin = node as BinaryNode;
  const left = evalCondition(bin.left, ctx);
  if (bin.op === 'AND') return left && evalCondition(bin.right, ctx);
  return left || evalCondition(bin.right, ctx);
}

export function interpretDsl(dsl: string, ctx: EvalContext): DslAppliedAction | null {
  const rule: RuleNode = parseDsl(dsl);
  if (!evalCondition(rule.condition, ctx)) return null;
  return { type: rule.action.name, args: rule.action.args };
}
