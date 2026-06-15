import { Injectable } from '@nestjs/common';

// Rules engine pattern: a list of rules evaluated in order.
// Each rule is a pure function: (context) → number | null.
// The engine applies the FIRST matching rule (priority order).
//
// Why a rules engine instead of nested if/else?
//   Adding a new tax jurisdiction = add one rule object, no existing code changes.
//   Rules can be stored in the database and loaded at runtime.
//   Rules are independently testable.

interface TaxContext {
  country: string;
  state?: string;
  subtotal: number;
  isDigitalGoods?: boolean;
  isExempt?: boolean; // true for tax-exempt users (e.g. resellers, non-profits)
}

interface TaxRule {
  name: string;
  matches: (ctx: TaxContext) => boolean;
  rate: number; // 0–1
}

const TAX_RULES: TaxRule[] = [
  /*
   - Tax-exempt users (resellers, non-profits) pay no tax regardless of jurisdiction.
   - Must be first rule — exempt status overrides all other rules.
   */
  { name: 'Tax Exempt', matches: (c) => c.isExempt === true, rate: 0 },
  /*
   - Digital goods: EU VAT applies uniformly regardless of member state.
   */
  {
    name: 'EU Digital VAT',
    matches: (c) => c.isDigitalGoods === true && EU_COUNTRIES.has(c.country),
    rate: 0.2,
  },
  // US state taxes
  { name: 'CA Sales Tax', matches: (c) => c.country === 'US' && c.state === 'CA', rate: 0.0725 },
  { name: 'NY Sales Tax', matches: (c) => c.country === 'US' && c.state === 'NY', rate: 0.08 },
  { name: 'TX Sales Tax', matches: (c) => c.country === 'US' && c.state === 'TX', rate: 0.0825 },
  // UK VAT
  { name: 'UK VAT', matches: (c) => c.country === 'GB', rate: 0.2 },
  // Default: no tax
  { name: 'No Tax', matches: () => true, rate: 0 },
];

const EU_COUNTRIES = new Set(['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'SE', 'PL']);

export interface TaxResult {
  ruleName: string;
  rate: number;
  amount: number;
}

@Injectable()
export class TaxService {
  calculate(ctx: TaxContext): TaxResult {
    const rule = TAX_RULES.find((r) => r.matches(ctx))!;
    const amount = Math.round(ctx.subtotal * rule.rate * 100) / 100;
    return { ruleName: rule.name, rate: rule.rate, amount };
  }

  // Expose rules for admin inspection / debugging
  getRules(): { name: string; rate: number }[] {
    return TAX_RULES.map(({ name, rate }) => ({ name, rate }));
  }
}
