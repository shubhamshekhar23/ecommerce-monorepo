import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "fr"],
  defaultLocale: "en",
  // 'as-needed' means the default locale (en) has no prefix at /products,
  // while other locales get /fr/products. Change to 'always' if you need
  // explicit /en/ URLs for canonical SEO purposes.
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

// RTL languages — add more as new locales are supported.
export const RTL_LOCALES = new Set<string>(["ar", "he", "ur", "fa"]);

export function getTextDirection(locale: string): "ltr" | "rtl" {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr";
}
