// Locale-aware formatting utilities.
// Always use these instead of hardcoding currency symbols, date strings,
// or plural rules — they adapt automatically when new locales are added.

/**
 * Format a monetary amount for the given locale and currency.
 *
 * @example
 * formatCurrency(29.99, 'en', 'USD') // "$29.99"
 * formatCurrency(29.99, 'fr', 'EUR') // "29,99 €"
 */
export function formatCurrency(
  amount: number,
  locale: string,
  currency = "USD",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date for the given locale with a medium date style.
 *
 * @example
 * formatDate('2024-03-15', 'en') // "Mar 15, 2024"
 * formatDate('2024-03-15', 'fr') // "15 mars 2024"
 */
export function formatDate(
  date: string | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  return new Intl.DateTimeFormat(locale, options).format(
    typeof date === "string" ? new Date(date) : date,
  );
}

/**
 * Format a relative time expression (e.g. "3 days ago").
 *
 * @example
 * formatRelativeTime(-3, 'day', 'en') // "3 days ago"
 * formatRelativeTime(1, 'month', 'fr') // "dans 1 mois"
 */
export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: string,
): string {
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    value,
    unit,
  );
}

/**
 * Pluralize a count using the locale's plural rules.
 * Pass a record of CLDR plural category → string.
 *
 * @example
 * formatPlural(1, { one: '# item', other: '# items' }, 'en') // "1 item"
 * formatPlural(3, { one: '# item', other: '# items' }, 'en') // "3 items"
 */
export function formatPlural(
  count: number,
  forms: Partial<Record<Intl.LDMLPluralRule, string>>,
  locale: string,
): string {
  const rule = new Intl.PluralRules(locale).select(count);
  const template = forms[rule] ?? forms.other ?? String(count);
  return template.replace("#", String(count));
}
