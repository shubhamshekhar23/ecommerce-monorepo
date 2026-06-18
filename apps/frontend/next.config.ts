import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import withPWAInit from "@ducanh2912/next-pwa";

// Fail fast at build/start time if required env vars are missing.
// The full Zod validation runs in src/shared/config/env.ts at module load.
// Skip validation when only running the bundle analyzer in CI (no server starts).
if (process.env.ANALYZE !== "true") {
  const requiredEnvVars = [
    "NEXT_PUBLIC_API_URL",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  ] as const;

  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      throw new Error(
        `Missing required environment variable: ${key}\nSee apps/frontend/.env.example`,
      );
    }
  }
}

// Content-Security-Policy in report-only mode.
// Collect browser violation reports without blocking anything.
// Once violations are reviewed and resolved, move to Content-Security-Policy.
//
// Notes on directives:
//   script-src 'unsafe-inline' — Next.js injects inline hydration scripts; required until nonce-based CSP is set up
//   connect-src https:         — covers the dynamic API URL (env var); tighten to the specific origin in production
//   frame-src js.stripe.com   — Stripe Elements render inside a cross-origin iframe
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "frame-src js.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  // Prevent the app from being embedded in any iframe (blocks clickjacking).
  { key: "X-Frame-Options", value: "DENY" },

  // Stop browsers from MIME-sniffing a response away from its declared content-type.
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Send full URL only for same-origin requests; send just the origin cross-origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Force HTTPS for 1 year on all sub-domains.
  // Only active once the deployment is confirmed HTTPS-only.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },

  // Disable browser features the app does not use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },

  // CSP in report-only mode — logs violations, does not enforce.
  { key: "Content-Security-Policy-Report-Only", value: cspDirectives },
];

const nextConfig: NextConfig = {
  images: {
    // Serve AVIF first (20-30% smaller than WebP), then WebP as fallback.
    // Next.js negotiates via Accept header — zero change required in <Image> props.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },

  // Tell Next.js which packages to tree-shake at build time.
  // Next.js will only bundle the specific named exports that are actually imported,
  // instead of pulling in the entire package.
  experimental: {
    optimizePackageImports: [
      "@tanstack/react-query",
      "@tanstack/react-virtual",
      "lucide-react",
      "date-fns",
    ],
  },

  async headers() {
    return [
      {
        // Apply to every route.
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Service Worker is only generated in production builds. In development
// next-pwa is effectively a no-op so HMR is unaffected.
const withPWA = withPWAInit({
  dest: "public",
  // Disable the SW in development so it doesn't cache stale responses
  // during active development.
  disable: process.env.NODE_ENV === "development",
  // Cache all Next.js static assets (JS, CSS, fonts) using a StaleWhileRevalidate
  // strategy — serve from cache instantly, revalidate in the background.
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
});

export default withBundleAnalyzer(withPWA(nextConfig));
