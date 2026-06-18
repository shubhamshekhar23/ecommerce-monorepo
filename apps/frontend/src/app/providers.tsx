// src/app/providers.tsx
// Client-side providers: QueryClientProvider, AuthProvider

"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster, toast } from "sonner";
import { queryClient } from "@/shared/queryClient";
import { AuthProvider } from "@/features/auth";
import { FeatureFlagProvider } from "@/shared/featureFlags";
import { CookieConsentBanner } from "@/components/CookieConsent/CookieConsentBanner";
import { eventBus } from "@/shared/eventBus";
import { useCookieConsent } from "@/shared/cookieConsent/useCookieConsent";
import { useAuthStore } from "@/store/auth.store";

// Subscribes to cross-feature events and renders feedback (toasts, etc.).
// Lives here so event-emitting hooks stay decoupled from the toast library.
function EventBusSubscriber() {
  useEffect(() => {
    const handleItemAdded = ({ productName }: { productName: string }) => {
      toast.success(`${productName} added to cart`);
    };
    const handleOrderPlaced = ({ orderNumber }: { orderNumber: string }) => {
      toast.success(`Order ${orderNumber} confirmed!`);
    };
    const handleSessionExpired = () => {
      toast.error("Your session expired. Please log in again.");
    };

    eventBus.on("cart:item-added", handleItemAdded);
    eventBus.on("order:placed", handleOrderPlaced);
    eventBus.on("auth:session-expired", handleSessionExpired);

    return () => {
      eventBus.off("cart:item-added", handleItemAdded);
      eventBus.off("order:placed", handleOrderPlaced);
      eventBus.off("auth:session-expired", handleSessionExpired);
    };
  }, []);

  return null;
}

// Syncs the logged-in user's identity to Sentry when error tracking is consented.
// Clears Sentry user context on logout to avoid cross-session leakage.
function SentryUserSync() {
  const user = useAuthStore((s) => s.user);
  const { consent } = useCookieConsent();

  useEffect(() => {
    if (!consent.errorTracking) {
      Sentry.setUser(null);
      return;
    }
    if (user) {
      Sentry.setUser({ id: user.id, email: user.email });
    } else {
      Sentry.setUser(null);
    }
  }, [user, consent.errorTracking]);

  return null;
}

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <FeatureFlagProvider>
        <AuthProvider>{children}</AuthProvider>
      </FeatureFlagProvider>

      <EventBusSubscriber />
      <SentryUserSync />
      <CookieConsentBanner />
      <Toaster position="top-right" richColors closeButton />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
