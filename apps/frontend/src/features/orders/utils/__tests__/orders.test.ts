import {
  isOrderCancellable,
  formatOrderTotal,
  formatOrderDate,
} from "../index";

describe("isOrderCancellable", () => {
  it("returns true for PENDING", () => {
    expect(isOrderCancellable("PENDING")).toBe(true);
  });

  it("returns true for CONFIRMED", () => {
    expect(isOrderCancellable("CONFIRMED")).toBe(true);
  });

  it("returns true for PROCESSING", () => {
    expect(isOrderCancellable("PROCESSING")).toBe(true);
  });

  it("returns false for SHIPPED", () => {
    expect(isOrderCancellable("SHIPPED")).toBe(false);
  });

  it("returns false for DELIVERED", () => {
    expect(isOrderCancellable("DELIVERED")).toBe(false);
  });

  it("returns false for CANCELLED", () => {
    expect(isOrderCancellable("CANCELLED")).toBe(false);
  });

  it("returns false for REFUNDED", () => {
    expect(isOrderCancellable("REFUNDED")).toBe(false);
  });
});

describe("formatOrderTotal", () => {
  it("prepends $ and shows 2 decimal places", () => {
    expect(formatOrderTotal(29.99)).toBe("$29.99");
  });

  it("pads a whole number with .00", () => {
    expect(formatOrderTotal(100)).toBe("$100.00");
  });

  it("rounds to 2 decimal places", () => {
    expect(formatOrderTotal(9.999)).toBe("$10.00");
  });

  it("handles zero", () => {
    expect(formatOrderTotal(0)).toBe("$0.00");
  });
});

describe("formatOrderDate", () => {
  it("returns a non-empty string", () => {
    expect(formatOrderDate("2024-03-15T12:00:00Z")).toBeTruthy();
  });

  it("includes the year", () => {
    expect(formatOrderDate("2024-03-15T12:00:00Z")).toContain("2024");
  });

  it("uses long month name", () => {
    const result = formatOrderDate("2024-03-15T12:00:00Z");
    expect(result).toContain("March");
  });
});
