import { env } from "./env";

export const config = {
  apiUrl: env.NEXT_PUBLIC_API_URL,
  appUrl: env.NEXT_PUBLIC_APP_URL,
  stripe: {
    publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  features: {
    wishlist: env.NEXT_PUBLIC_FLAG_WISHLIST,
    recommendations: env.NEXT_PUBLIC_FLAG_RECOMMENDATIONS,
  },
} as const;

export const API_URL = config.apiUrl;
