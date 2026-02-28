// src/app/admin/products/[id]/edit/page.tsx

'use client';

import type { Metadata } from 'next';
import { useParams } from 'next/navigation';
import { useAdminProduct } from '@/features/admin/hooks';
import { ProductForm } from '@/features/admin/components/ProductForm/ProductForm';

export default function EditProductPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: product, isLoading, error } = useAdminProduct(id);

  if (isLoading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading product...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#cb2431' }}>
        Error loading product: {error.message}
      </div>
    );
  }

  if (!product) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Product not found</div>;
  }

  return <ProductForm product={product} />;
}
