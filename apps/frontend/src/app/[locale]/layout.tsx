import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { Hanken_Grotesk } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Providers } from "./providers";
import { Header } from "@/components/Header/Header";
import { Navbar } from "@/components/Navbar/Navbar";
import { Footer } from "@/components/Footer/Footer";
import { WebVitals } from "@/components/WebVitals/WebVitals";
import { routing, getTextDirection } from "@/i18n/routing";
import "@/styles/globals.scss";
import styles from "./layout.module.scss";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "").origin;
  } catch {
    return "";
  }
})();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const languageAlternates = Object.fromEntries(
    routing.locales.map((l) => [l, `${APP_URL}/${l}`]),
  );

  return {
    title: { template: "%s | ShopHub", default: "ShopHub - Online Shopping" },
    description: "Shop online for products at unbeatable prices",
    alternates: {
      canonical: `${APP_URL}/${locale}`,
      languages: {
        ...languageAlternates,
        "x-default": `${APP_URL}/${routing.defaultLocale}`,
      },
    },
  };
}

// Tell Next.js which locale segments exist so static pages can be generated.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

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

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const messages = await getMessages();
  const dir = getTextDirection(locale);
  const headersList = await headers();
  const isAuthenticated = headersList.get("x-auth-hint") === "1";

  return (
    <html lang={locale} dir={dir} className={hankenGrotesk.variable}>
      <head>
        {API_ORIGIN && <link rel="preconnect" href={API_ORIGIN} />}
        {API_ORIGIN && <link rel="dns-prefetch" href={API_ORIGIN} />}
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`,
          }}
        />
      </head>
      <body>
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

        <NextIntlClientProvider messages={messages}>
          <Providers isAuthenticated={isAuthenticated}>
            <Header />
            <Navbar />
            <main id="main-content" className={styles.main}>
              {children}
            </main>
            <Footer />
          </Providers>
        </NextIntlClientProvider>

        {GA_ID && <WebVitals />}
      </body>
    </html>
  );
}
