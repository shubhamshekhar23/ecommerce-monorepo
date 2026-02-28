// src/app/admin/products/new/page.tsx

import type { Metadata } from 'next';
import { ProductForm } from '@/features/admin/components/ProductForm/ProductForm';

export const metadata: Metadata = {
  title: 'Create Product | Admin',
  description: 'Create a new product',
};

export default function NewProductPage() {
  return <ProductForm />;
}
