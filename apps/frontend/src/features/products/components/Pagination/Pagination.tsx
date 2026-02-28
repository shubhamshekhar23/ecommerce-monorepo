// src/features/products/components/Pagination/Pagination.tsx

'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { PaginationMeta } from '../../interfaces';
import styles from './Pagination.module.scss';

interface PaginationProps {
  meta: PaginationMeta;
}

export function Pagination({ meta }: PaginationProps) {
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get('page')) || 1;

  const buildHref = (page: number): string => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    return `?${params.toString()}`;
  };

  const getPageNumbers = (): (number | string)[] => {
    const { pages } = meta;
    const range = 5;
    const half = Math.floor(range / 2);

    let start = Math.max(1, currentPage - half);
    let end = Math.min(pages, start + range - 1);

    if (end - start + 1 < range) {
      start = Math.max(1, end - range + 1);
    }

    const pageNumbers: (number | string)[] = [];

    if (start > 1) {
      pageNumbers.push(1);
      if (start > 2) {
        pageNumbers.push('...');
      }
    }

    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }

    if (end < pages) {
      if (end < pages - 1) {
        pageNumbers.push('...');
      }
      pageNumbers.push(pages);
    }

    return pageNumbers;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={styles.pagination}>
      {currentPage > 1 && (
        <Link href={buildHref(currentPage - 1)} className={styles.button}>
          ← Prev
        </Link>
      )}

      <div className={styles.pages}>
        {pageNumbers.map((page, idx) =>
          page === '...' ? (
            <span key={`dots-${idx}`} className={styles.dots}>
              …
            </span>
          ) : (
            <Link
              key={page}
              href={buildHref(page as number)}
              className={`${styles.page} ${
                page === currentPage ? styles.active : ''
              }`}
            >
              {page}
            </Link>
          )
        )}
      </div>

      {meta.hasMore && (
        <Link href={buildHref(currentPage + 1)} className={styles.button}>
          Next →
        </Link>
      )}
    </div>
  );
}
