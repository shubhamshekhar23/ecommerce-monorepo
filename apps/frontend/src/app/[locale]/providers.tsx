// src/app/providers.tsx
// Client-side providers: QueryClientProvider, AuthProvider

"use client";

import { useEffect, useLayoutEffect } from "react";
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
import { useDrainCartQueue } from "@/features/cart/hooks";

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

function CartQueueDrainer() {
  useDrainCartQueue();
  return null;
}

interface ProvidersProps {
  children: React.ReactNode;
  isAuthenticated?: boolean;
}

export function Providers({
  children,
  isAuthenticated = false,
}: ProvidersProps) {
  const setStatus = useAuthStore((s) => s.setStatus);

  // Pre-seed auth status from the server hint before the first browser paint.
  // This eliminates the 'loading' flash on pages where the server already knows
  // the user has a session (middleware sets x-auth-hint when auth_session cookie exists).
  // useLayoutEffect fires synchronously after React's DOM update but before paint,
  // so the user never sees the intermediate 'loading' state.
  // useAuthHydration will still run to validate the token and populate user data.
  useLayoutEffect(() => {
    if (isAuthenticated) {
      setStatus("authenticated");
    }
  }, [isAuthenticated, setStatus]);

  return (
    <QueryClientProvider client={queryClient}>
      <FeatureFlagProvider>
        <AuthProvider>{children}</AuthProvider>
      </FeatureFlagProvider>

      <EventBusSubscriber />
      <SentryUserSync />
      <CartQueueDrainer />
      <CookieConsentBanner />
      <Toaster position="top-right" richColors closeButton />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
