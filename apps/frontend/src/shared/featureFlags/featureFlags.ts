import { env } from "@/shared/config/env";

export interface Flags {
  wishlist: boolean;
  recommendations: boolean;
  newCheckout: boolean;
  newSearch: boolean;
  darkMode: boolean;
  adminV2: boolean;
}

export const defaultFlags: Flags = {
  wishlist: false,
  recommendations: false,
  newCheckout: false,
  newSearch: false,
  darkMode: false,
  adminV2: false,
};

export function loadFlagsFromEnv(): Flags {
  return {
    wishlist: env.NEXT_PUBLIC_FLAG_WISHLIST,
    recommendations: env.NEXT_PUBLIC_FLAG_RECOMMENDATIONS,
    newCheckout: env.NEXT_PUBLIC_FLAG_NEW_CHECKOUT,
    newSearch: env.NEXT_PUBLIC_FLAG_NEW_SEARCH,
    darkMode: env.NEXT_PUBLIC_FLAG_DARK_MODE,
    adminV2: env.NEXT_PUBLIC_FLAG_ADMIN_V2,
  };
}
