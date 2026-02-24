// src/features/admin/components/ProductForm/ProductForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCategories } from '@/features/products/hooks';
import { useCreateProduct } from '../../hooks';
import styles from './ProductForm.module.scss';

export function ProductForm() {
  const router = useRouter();
  const { data: categoriesData } = useCategories();
  const { mutate: createProduct, isPending } = useCreateProduct();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    cost: '',
    stock: '',
    categoryId: '',
  });

  const handleNameChange = (value: string): void => {
    const slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setFormData((prev) => ({ ...prev, name: value, slug }));
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    createProduct(
      {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        price: Number(formData.price),
        cost: Number(formData.cost),
        stock: Number(formData.stock) || 0,
        categoryId: formData.categoryId,
      },
      {
        onSuccess: () => {
          router.push('/admin/products');
        },
      },
    );
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Create Product</h1>

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

        <div className={styles.row}>
          <div className={styles.fieldGroup}>
            <label htmlFor="price">Price *</label>
            <input
              id="price"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.price}
              onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
              className={styles.input}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="cost">Cost *</label>
            <input
              id="cost"
              type="number"
              step="0.01"
              min="0"
              required
              value={formData.cost}
              onChange={(e) => setFormData((prev) => ({ ...prev, cost: e.target.value }))}
              className={styles.input}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="stock">Stock</label>
            <input
              id="stock"
              type="number"
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData((prev) => ({ ...prev, stock: e.target.value }))}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="category">Category *</label>
          <select
            id="category"
            required
            value={formData.categoryId}
            onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: e.target.value }))}
            className={styles.select}
          >
            <option value="">Select a category</option>
            {categoriesData?.data.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.submitBtn} disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Product'}
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
