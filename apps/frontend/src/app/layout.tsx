import type { Metadata } from 'next';
import { Providers } from './providers';
import { Header } from '@/components/Header/Header';
import { Navbar } from '@/components/Navbar/Navbar';
import { Footer } from '@/components/Footer/Footer';
import '@/styles/globals.scss';
import styles from './layout.module.scss';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  title: { template: '%s | ShopHub', default: 'ShopHub - Online Shopping' },
  description: 'Shop online for products at unbeatable prices',
  alternates: { canonical: APP_URL },
};

// WebSite schema with SearchAction tells Google to show a search box in results
// pointing to our product search.
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'ShopHub',
  url: APP_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${APP_URL}/products?search={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? '').origin;
  } catch {
    return '';
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
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <Providers>
          <Header />
          <Navbar />
          <main id="main-content" className={styles.main}>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
