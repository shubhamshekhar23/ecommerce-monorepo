// src/app/providers.tsx
// Client-side providers: QueryClientProvider, AuthProvider

'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { queryClient } from '@/shared/queryClient';
import { AuthProvider } from '@/features/auth/components/AuthProvider/AuthProvider';
import { CookieConsentBanner } from '@/components/CookieConsent/CookieConsentBanner';
// Phase 10: import { useCookieConsent } from '@/shared/cookieConsent/useCookieConsent';
// Phase 10: import { GoogleAnalyticsScript } from '@/components/Analytics/GoogleAnalytics';
// Phase 10: import { SentryInit } from '@/components/Analytics/SentryInit';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Phase 10: const { consent } = useCookieConsent();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>

      {/* Phase 10: conditionally load analytics/Sentry based on consent
          {consent.analytics && <GoogleAnalyticsScript />}
          {consent.errorTracking && <SentryInit />}
      */}

      <CookieConsentBanner />
      <Toaster position="top-right" richColors closeButton />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
