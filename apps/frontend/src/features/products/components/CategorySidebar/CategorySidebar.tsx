// src/features/products/components/CategorySidebar/CategorySidebar.tsx

'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCategories } from '../../hooks';
import styles from './CategorySidebar.module.scss';

export function CategorySidebar() {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category');
  const { data, isLoading } = useCategories();

  const categories = data?.data || [];

  return (
    <aside className={styles.sidebar}>
      <h3 className={styles.heading}>Department</h3>

      {isLoading ? (
        <div className={styles.loading}>Loading categories...</div>
      ) : categories.length === 0 ? (
        <div className={styles.empty}>No categories available</div>
      ) : (
        <ul className={styles.list}>
          {categories.map((category) => {
            const isActive = activeCategory === category.slug;
            return (
              <li key={category.id}>
                <Link
                  href={`/products?category=${category.slug}`}
                  className={`${styles.link} ${isActive ? styles.active : ''}`}
                >
                  {category.name}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
