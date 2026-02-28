// src/app/products/[slug]/page.tsx

import { ProductDetailView } from '@/features/products/components/ProductDetailView/ProductDetailView';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return {
    title: `${slug} | ShopHub`,
    description: 'View product details.',
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  return <ProductDetailView slug={slug} />;
}
