// src/app/products/[slug]/page.tsx

import { ProductDetailView } from '@/features/products/components/ProductDetailView/ProductDetailView';

// Re-generate at most once per hour. New products appear after the next
// revalidation window; no deploy required.
export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

// Pre-generate a static page for every product at build time.
// Each page becomes a CDN-cached HTML file — zero server cost per view.
export async function generateStaticParams() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/products?limit=1000`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data as Array<{ slug: string }>).map((p) => ({ slug: p.slug }));
  } catch {
    // If the API is unreachable at build time, fall back to on-demand SSR.
    return [];
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/products/slug/${slug}`,
      { next: { revalidate: 3600 } },
    );
    if (res.ok) {
      const product = await res.json();
      return {
        title: `${product.name} | ShopHub`,
        description: product.description ?? `Buy ${product.name} at ShopHub.`,
      };
    }
  } catch { /* fall through to default */ }
  return {
    title: 'Product | ShopHub',
    description: 'View product details at ShopHub.',
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  return <ProductDetailView slug={slug} />;
}
