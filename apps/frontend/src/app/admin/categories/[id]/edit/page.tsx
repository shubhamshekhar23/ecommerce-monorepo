// src/app/admin/categories/[id]/edit/page.tsx

'use client';

import { useParams } from 'next/navigation';
import { useAdminCategory } from '@/features/admin/hooks';
import { CategoryForm } from '@/features/admin/components/CategoryForm/CategoryForm';

export default function EditCategoryPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: category, isLoading, error } = useAdminCategory(id);

  if (isLoading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading category...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#cb2431' }}>
        Error loading category: {error.message}
      </div>
    );
  }

  if (!category) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Category not found</div>;
  }

  return <CategoryForm category={category} />;
}
