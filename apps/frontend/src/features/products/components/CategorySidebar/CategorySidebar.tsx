"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCategories } from "../../hooks";
import styles from "./CategorySidebar.module.scss";

const PRICE_RANGES = [
  { label: "Under $25", min: undefined as number | undefined, max: 25 },
  { label: "$25–$75", min: 25, max: 75 },
  { label: "$75–$150", min: 75, max: 150 },
  { label: "$150+", min: 150, max: undefined as number | undefined },
];

export function CategorySidebar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeCategory = searchParams.get("category");
  const activeMin = searchParams.get("minPrice");
  const activeMax = searchParams.get("maxPrice");
  const { data, isLoading } = useCategories();

  const categories = data?.data || [];

  const handleCategoryClick = (slug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set("category", slug);
    } else {
      params.delete("category");
    }
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const handlePriceClick = (min?: number, max?: number) => {
    const params = new URLSearchParams(searchParams.toString());
    const curMin = activeMin !== null ? Number(activeMin) : undefined;
    const curMax = activeMax !== null ? Number(activeMax) : undefined;

    if (curMin === min && curMax === max) {
      params.delete("minPrice");
      params.delete("maxPrice");
    } else {
      if (min !== undefined) {
        params.set("minPrice", String(min));
      } else {
        params.delete("minPrice");
      }
      if (max !== undefined) {
        params.set("maxPrice", String(max));
      } else {
        params.delete("maxPrice");
      }
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <aside className={styles.sidebar}>
      <section className={styles.section}>
        <h2 className={styles.eyebrow}>Category</h2>
        {isLoading ? (
          <p className={styles.loading}>Loading…</p>
        ) : (
          <ul className={styles.list}>
            <li>
              <button
                className={`${styles.categoryBtn} ${!activeCategory ? styles.active : ""}`}
                onClick={() => handleCategoryClick(null)}
              >
                All Products
              </button>
            </li>
            {categories.map((cat) => (
              <li key={cat.id}>
                <button
                  className={`${styles.categoryBtn} ${activeCategory === cat.slug ? styles.active : ""}`}
                  onClick={() => handleCategoryClick(cat.slug)}
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.eyebrow}>Price</h2>
        <div className={styles.priceGrid}>
          {PRICE_RANGES.map((range) => {
            const curMin = activeMin !== null ? Number(activeMin) : undefined;
            const curMax = activeMax !== null ? Number(activeMax) : undefined;
            const isActive = curMin === range.min && curMax === range.max;
            return (
              <button
                key={range.label}
                className={`${styles.priceBtn} ${isActive ? styles.priceBtnActive : ""}`}
                onClick={() => handlePriceClick(range.min, range.max)}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
