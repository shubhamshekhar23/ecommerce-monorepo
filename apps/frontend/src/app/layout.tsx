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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <Providers>
          <Header />
          <Navbar />
          <main className={styles.main}>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
