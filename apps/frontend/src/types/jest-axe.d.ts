declare module "jest-axe" {
  type AxeResults = { violations: AxeViolation[] };
  type AxeViolation = Record<string, unknown>;

  export function axe(
    html: Element | string,
    options?: Record<string, unknown>,
  ): Promise<AxeResults>;

  export const toHaveNoViolations: Record<string, unknown>;
}

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
    }
  }
}
