"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Navbar.module.scss";

const CATEGORIES = [
  { id: "all", label: "All Products", href: "/products" },
  { id: "deals", label: "Deals", href: "/products?filter=deals" },
  { id: "new", label: "New In", href: "/products?sort=newest" },
  {
    id: "bestsellers",
    label: "Best Sellers",
    href: "/products?sort=popularity",
  },
  { id: "gifts", label: "Gift Cards", href: "/gifts" },
];

export function Navbar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    (pathname.endsWith("/products") && href === "/products") ||
    (href !== "/products" && pathname.includes(href.split("?")[0]));

  return (
    <nav className={styles.navbar} aria-label="Store categories">
      <div className={styles.container}>
        {CATEGORIES.map((category) => (
          <Link
            key={category.id}
            href={category.href}
            className={`${styles.link} ${isActive(category.href) ? styles.active : ""}`}
          >
            {isActive(category.href) && (
              <span className={styles.activeDot} aria-hidden="true" />
            )}
            {category.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
