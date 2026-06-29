"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Navbar.module.scss";

interface Category {
  id: string;
  label: string;
  href: string;
}

export function NavbarLinks({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    (pathname.endsWith("/products") && href === "/products") ||
    (href !== "/products" && pathname.includes(href.split("?")[0]));

  return (
    <>
      {categories.map((category) => (
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
    </>
  );
}
