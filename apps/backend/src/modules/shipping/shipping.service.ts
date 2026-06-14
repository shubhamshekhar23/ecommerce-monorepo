import { Injectable } from '@nestjs/common';

// Strategy pattern: each calculator implements the same interface.
// ShippingService picks which strategy to use at runtime based on
// order properties — no if/else chains in the caller.
//
// Adding a new shipping method = add a new class, register it, done.
// No modification to existing code (Open/Closed Principle).
interface ShippingStrategy {
  name: string;
  calculate(subtotal: number, weightKg: number, country: string): number;
}

class FreeShippingStrategy implements ShippingStrategy {
  name = 'free';
  calculate(): number {
    return 0;
  }
}

class FlatRateStrategy implements ShippingStrategy {
  name = 'flat_rate';
  // $5 domestic, $15 international
  calculate(_subtotal: number, _weightKg: number, country: string): number {
    return country === 'US' ? 5 : 15;
  }
}

class WeightBasedStrategy implements ShippingStrategy {
  name = 'weight_based';
  // $2 per kg, min $3
  calculate(_subtotal: number, weightKg: number): number {
    return Math.max(3, weightKg * 2);
  }
}

export interface ShippingQuote {
  strategy: string;
  cost: number;
}

@Injectable()
export class ShippingService {
  private readonly strategies: ShippingStrategy[] = [
    new FreeShippingStrategy(),
    new FlatRateStrategy(),
    new WeightBasedStrategy(),
  ];

  // Returns all available quotes so the frontend can let the user choose.
  getQuotes(subtotal: number, weightKg: number, country: string): ShippingQuote[] {
    return this.strategies.map((s) => ({
      strategy: s.name,
      cost: s.calculate(subtotal, weightKg, country),
    }));
  }

  // Returns the cheapest option — used when no selection is made.
  getCheapest(subtotal: number, weightKg: number, country: string): ShippingQuote {
    return this.getQuotes(subtotal, weightKg, country).sort((a, b) => a.cost - b.cost)[0];
  }

  // Free shipping threshold: orders over $50 qualify for free.
  // This is a business rule, not a strategy — it selects which strategy to apply.
  selectStrategy(subtotal: number, weightKg: number, country: string): ShippingQuote {
    if (subtotal >= 50) return { strategy: 'free', cost: 0 };
    return this.getCheapest(subtotal, weightKg, country);
  }
}
