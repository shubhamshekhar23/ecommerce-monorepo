import type { Metadata } from 'next';
import { Providers } from './providers';
import { Header } from '@/components/Header/Header';
import { Navbar } from '@/components/Navbar/Navbar';
import { Footer } from '@/components/Footer/Footer';
import '@/styles/globals.scss';
import styles from './layout.module.scss';

export const metadata: Metadata = {
  title: { template: '%s | ShopHub', default: 'ShopHub - Online Shopping' },
  description: 'Shop online for products at unbeatable prices',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
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
