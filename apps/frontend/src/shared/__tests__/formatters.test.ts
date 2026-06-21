import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  formatPlural,
} from "../formatters";

describe("formatCurrency", () => {
  it("formats USD cents correctly", () => {
    expect(formatCurrency(29.99, "en", "USD")).toBe("$29.99");
  });

  it("uses USD as the default currency", () => {
    expect(formatCurrency(0, "en")).toBe("$0.00");
  });

  it("always shows exactly 2 decimal places", () => {
    expect(formatCurrency(100, "en", "USD")).toBe("$100.00");
  });

  it("handles large amounts", () => {
    expect(formatCurrency(1234.56, "en", "USD")).toBe("$1,234.56");
  });
});

describe("formatDate", () => {
  it("formats a Date object in medium date style", () => {
    const result = formatDate(new Date(2024, 2, 15), "en"); // Mar 15, 2024 local time
    expect(result).toBe("Mar 15, 2024");
  });

  it("formats a Date string", () => {
    // Noon local time avoids midnight UTC → previous-day edge cases
    const result = formatDate("2024-03-15T12:00:00", "en");
    expect(result).toContain("2024");
    expect(result).toContain("15");
  });

  it("accepts custom format options", () => {
    const result = formatDate(new Date(2024, 2, 15), "en", { year: "numeric" });
    expect(result).toBe("2024");
  });
});

describe("formatRelativeTime", () => {
  it('formats a past day as "N days ago"', () => {
    expect(formatRelativeTime(-3, "day", "en")).toBe("3 days ago");
  });

  it('formats yesterday with "auto" numeric as "yesterday"', () => {
    expect(formatRelativeTime(-1, "day", "en")).toBe("yesterday");
  });

  it("formats a future month", () => {
    expect(formatRelativeTime(1, "month", "en")).toBe("next month");
  });

  it("formats multiple hours ago", () => {
    expect(formatRelativeTime(-2, "hour", "en")).toBe("2 hours ago");
  });
});

describe("formatPlural", () => {
  it('uses the "one" form for count 1', () => {
    expect(formatPlural(1, { one: "# item", other: "# items" }, "en")).toBe(
      "1 item",
    );
  });

  it('uses the "other" form for count 0', () => {
    expect(formatPlural(0, { one: "# item", other: "# items" }, "en")).toBe(
      "0 items",
    );
  });

  it('uses the "other" form for count > 1', () => {
    expect(formatPlural(3, { one: "# item", other: "# items" }, "en")).toBe(
      "3 items",
    );
  });

  it("falls back to count string when no matching form", () => {
    expect(formatPlural(5, { one: "# item" }, "en")).toBe("5");
  });

  it("replaces # with the count", () => {
    expect(formatPlural(42, { other: "# products" }, "en")).toBe("42 products");
  });
});
