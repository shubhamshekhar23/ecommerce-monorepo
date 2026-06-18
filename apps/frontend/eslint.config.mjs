import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Note: eslint-config-next/core-web-vitals already bundles eslint-plugin-jsx-a11y
// at the recommended rule set. No separate import needed.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Treat _-prefixed params and vars as intentionally unused (TypeScript convention).
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],

      // Bounded context enforcement (DDD): features expose a public API via index.ts.
      // Warn when code imports directly from a feature's internal path (e.g.
      // '@/features/cart/hooks/useCart') instead of the public barrel
      // ('@/features/cart'). Three-segment paths (@/features/cart/hooks) are
      // allowed because own-feature internal imports need that level.
      'no-restricted-imports': ['warn', {
        patterns: [
          {
            group: ['@/features/*/*/**'],
            message: "Import from the feature's public index (e.g. '@/features/cart') instead of its internal path.",
          },
        ],
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
