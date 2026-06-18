// src/app/providers.tsx
// Client-side providers: QueryClientProvider, AuthProvider

"use client";

import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster, toast } from "sonner";
import { queryClient } from "@/shared/queryClient";
import { AuthProvider } from "@/features/auth";
import { FeatureFlagProvider } from "@/shared/featureFlags";
import { CookieConsentBanner } from "@/components/CookieConsent/CookieConsentBanner";
import { eventBus } from "@/shared/eventBus";
// Phase 10: import { useCookieConsent } from '@/shared/cookieConsent/useCookieConsent';
// Phase 10: import { GoogleAnalyticsScript } from '@/components/Analytics/GoogleAnalytics';
// Phase 10: import { SentryInit } from '@/components/Analytics/SentryInit';

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

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Phase 10: const { consent } = useCookieConsent();

  return (
    <QueryClientProvider client={queryClient}>
      <FeatureFlagProvider>
        <AuthProvider>{children}</AuthProvider>
      </FeatureFlagProvider>

      {/* Phase 10: conditionally load analytics/Sentry based on consent
          {consent.analytics && <GoogleAnalyticsScript />}
          {consent.errorTracking && <SentryInit />}
      */}

      <EventBusSubscriber />
      <CookieConsentBanner />
      <Toaster position="top-right" richColors closeButton />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
