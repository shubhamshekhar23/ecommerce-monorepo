"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCategories } from "../../hooks";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import styles from "./CategorySidebar.module.scss";

export function CategorySidebar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeCategory = searchParams.get("category");
  const { data, isLoading } = useCategories();
  const [collapsed, setCollapsed] = useLocalStorage(
    "category-sidebar-collapsed",
    false,
  );

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

  return (
    <aside className={styles.sidebar}>
      <button
        className={styles.heading}
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
      >
        Department
        <span
          className={`${styles.chevron} ${collapsed ? styles.chevronCollapsed : ""}`}
        >
          ▾
        </span>
      </button>

      {!collapsed &&
        (isLoading ? (
          <div className={styles.loading}>Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className={styles.empty}>No categories available</div>
        ) : (
          <ul className={styles.list}>
            <li>
              <button
                className={`${styles.link} ${!activeCategory ? styles.active : ""}`}
                onClick={() => handleCategoryClick(null)}
              >
                All
              </button>
            </li>
            {categories.map((category) => {
              const isActive = activeCategory === category.slug;
              return (
                <li key={category.id}>
                  <button
                    className={`${styles.link} ${isActive ? styles.active : ""}`}
                    onClick={() => handleCategoryClick(category.slug)}
                  >
                    {category.name}
                  </button>
                </li>
              );
            })}
          </ul>
        ))}
    </aside>
  );
}
