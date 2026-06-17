import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_FLAG_WISHLIST: z.coerce.boolean().default(false),
  NEXT_PUBLIC_FLAG_RECOMMENDATIONS: z.coerce.boolean().default(false),
});

// Explicit key access is required in Next.js — process.env spread does not work
// because NEXT_PUBLIC_* vars are statically inlined by the bundler at build time.
const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_FLAG_WISHLIST: process.env.NEXT_PUBLIC_FLAG_WISHLIST,
  NEXT_PUBLIC_FLAG_RECOMMENDATIONS:
    process.env.NEXT_PUBLIC_FLAG_RECOMMENDATIONS,
});

if (!parsed.success) {
  const missing = parsed.error.issues
    .map((i) => `  ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(
    `Invalid environment variables:\n${missing}\n\nSee apps/frontend/.env.example for required variables.`,
  );
}

export const env = parsed.data;
export type Env = typeof env;
