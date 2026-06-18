// src/app/products/[slug]/page.tsx

import { ProductDetailView } from '@/features/products/components/ProductDetailView/ProductDetailView';

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function fetchProduct(slug: string) {
  try {
    const res = await fetch(`${API_URL}/products/slug/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/products?limit=1000`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data as Array<{ slug: string }>).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  if (!product) {
    return {
      title: 'Product | ShopHub',
      description: 'View product details at ShopHub.',
    };
  }

  const description = (product.description ?? `Buy ${product.name} at ShopHub.`).slice(0, 155);
  const image = product.images?.[0]?.url;
  const canonical = `${APP_URL}/products/${slug}`;

  return {
    title: `${product.name} | ShopHub`,
    description,
    alternates: { canonical },
    openGraph: {
      title: product.name,
      description,
      url: canonical,
      type: 'website',
      ...(image && { images: [{ url: image, alt: product.name }] }),
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  // Product schema enables rich results (price, availability) in Google Search.
  const jsonLd = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description ?? undefined,
        image: product.images?.[0]?.url,
        offers: {
          '@type': 'Offer',
          price: String(product.price),
          priceCurrency: 'USD',
          availability:
            product.stock > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
        },
      }
    : null;

  const breadcrumbLd = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${APP_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Products', item: `${APP_URL}/products` },
          ...(product.category
            ? [
                { '@type': 'ListItem', position: 3, name: product.category.name, item: `${APP_URL}/products?category=${product.category.slug}` },
                { '@type': 'ListItem', position: 4, name: product.name },
              ]
            : [{ '@type': 'ListItem', position: 3, name: product.name }]),
        ],
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {breadcrumbLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
      )}
      <ProductDetailView slug={slug} />
    </>
  );
}
