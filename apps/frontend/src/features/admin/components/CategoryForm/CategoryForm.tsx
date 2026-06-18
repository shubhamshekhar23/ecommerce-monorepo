'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminCategories, useCreateCategory, useUpdateCategory } from '../../hooks';
import type { Category } from '@/features/products/interfaces';
import { Input, Select, Textarea } from '@/components/Form';
import styles from './CategoryForm.module.scss';

interface CategoryFormProps {
  category?: Category;
}

export function CategoryForm({ category }: CategoryFormProps) {
  const router = useRouter();
  const { data: categoriesData } = useAdminCategories();
  const { mutate: createCategory, isPending: isCreating } = useCreateCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory();

  const isEditMode = !!category;
  const isPending = isCreating || isUpdating;

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    parentId: '',
  });

  useEffect(() => {
    if (category) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        image: category.image || '',
        parentId: category.parentId || '',
      });
    }
  }, [category]);

  const handleNameChange = (value: string): void => {
    const slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setFormData((prev) => ({ ...prev, name: value, slug }));
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    const payload: { name: string; slug: string; description?: string; image?: string; parentId?: string } = {
      name: formData.name,
      slug: formData.slug,
    };

    if (formData.description) payload.description = formData.description;
    if (formData.image) payload.image = formData.image;
    if (formData.parentId) payload.parentId = formData.parentId;

    if (isEditMode && category) {
      updateCategory({ id: category.id, data: payload }, { onSuccess: () => router.push('/admin/categories') });
    } else {
      createCategory(payload, { onSuccess: () => router.push('/admin/categories') });
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{isEditMode ? 'Edit Category' : 'Create Category'}</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          id="name"
          label="Name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => handleNameChange(e.target.value)}
        />

        <Input
          id="slug"
          label="Slug"
          type="text"
          required
          value={formData.slug}
          onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
        />

        <Textarea
          id="description"
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          rows={4}
        />

        <Input
          id="image"
          label="Image URL"
          type="url"
          value={formData.image}
          onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
        />

        <Select
          id="parent"
          label="Parent Category"
          value={formData.parentId}
          onChange={(e) => setFormData((prev) => ({ ...prev, parentId: e.target.value }))}
        >
          <option value="">None (top-level)</option>
          {categoriesData?.data.map((cat) => (
            <option key={cat.id} value={cat.id} disabled={isEditMode && cat.id === category?.id}>
              {cat.name}
            </option>
          ))}
        </Select>

        <div className={styles.actions}>
          <button type="submit" className={styles.submitBtn} disabled={isPending}>
            {isPending ? (isEditMode ? 'Saving...' : 'Creating...') : isEditMode ? 'Save Changes' : 'Create Category'}
          </button>
          <button type="button" className={styles.cancelBtn} onClick={() => router.back()} disabled={isPending}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
