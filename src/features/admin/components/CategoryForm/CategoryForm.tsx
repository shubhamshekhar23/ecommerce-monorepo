// src/features/admin/components/CategoryForm/CategoryForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminCategories, useCreateCategory } from '../../hooks';
import styles from './CategoryForm.module.scss';

export function CategoryForm() {
  const router = useRouter();
  const { data: categoriesData } = useAdminCategories();
  const { mutate: createCategory, isPending } = useCreateCategory();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    parentId: '',
  });

  const handleNameChange = (value: string): void => {
    const slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setFormData((prev) => ({ ...prev, name: value, slug }));
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    createCategory(
      {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        image: formData.image || undefined,
        parentId: formData.parentId || undefined,
      },
      {
        onSuccess: () => {
          router.push('/admin/categories');
        },
      },
    );
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Create Category</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.fieldGroup}>
          <label htmlFor="name">Name *</label>
          <input
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="slug">Slug *</label>
          <input
            id="slug"
            type="text"
            required
            value={formData.slug}
            onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
            className={styles.input}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            className={styles.textarea}
            rows={4}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="image">Image URL</label>
          <input
            id="image"
            type="url"
            value={formData.image}
            onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
            className={styles.input}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="parent">Parent Category</label>
          <select
            id="parent"
            value={formData.parentId}
            onChange={(e) => setFormData((prev) => ({ ...prev, parentId: e.target.value }))}
            className={styles.select}
          >
            <option value="">None (top-level)</option>
            {categoriesData?.data.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.submitBtn} disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Category'}
          </button>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
