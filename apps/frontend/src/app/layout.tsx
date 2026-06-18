import type { Metadata } from "next";
import Script from "next/script";
import NextTopLoader from "nextjs-toploader";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Providers } from "./providers";
import { Header } from "@/components/Header/Header";
import { Navbar } from "@/components/Navbar/Navbar";
import { Footer } from "@/components/Footer/Footer";
import "@/styles/globals.scss";
import styles from "./layout.module.scss";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const metadata: Metadata = {
  title: { template: "%s | ShopHub", default: "ShopHub - Online Shopping" },
  description: "Shop online for products at unbeatable prices",
  alternates: { canonical: APP_URL },
};

// WebSite schema with SearchAction tells Google to show a search box in results
// pointing to our product search.
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ShopHub",
  url: APP_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${APP_URL}/products?search={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "").origin;
  } catch {
    return "";
  }
})();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Open TCP+TLS connections early so the first API call pays no handshake cost. */}
        {API_ORIGIN && <link rel="preconnect" href={API_ORIGIN} />}
        {API_ORIGIN && <link rel="dns-prefetch" href={API_ORIGIN} />}
        {/* Stripe JS is loaded on checkout — preconnect so the iframe is ready sooner. */}
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
        {/* FOUC prevention: read theme from localStorage before first paint so the
            page renders in the correct theme without a flash. Runs synchronously
            before hydration. This is one of the few legitimate uses of
            dangerouslySetInnerHTML — it contains no user input. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        {/* GA4 — loaded only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set.
            strategy="afterInteractive" defers execution until page is interactive
            so it does not block the critical rendering path. */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:false})`}
            </Script>
          </>
        )}

        <NextTopLoader color="var(--color-accent)" showSpinner={false} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers>
          <Header />
          <Navbar />
          <main id="main-content" className={styles.main}>
            {children}
          </main>
          <Footer />
        </Providers>

        {/* Vercel Analytics tracks Core Web Vitals and page view data. */}
        <Analytics />
        {/* Vercel Speed Insights tracks real-user performance scores. */}
        <SpeedInsights />
      </body>
    </html>
  );
}
