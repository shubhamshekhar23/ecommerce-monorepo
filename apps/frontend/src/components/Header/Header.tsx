import Image from "next/image";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import { HeaderActions } from "./HeaderActions";
import styles from "./Header.module.scss";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.brand}>
          <Image
            src="/images/logo-icon.png"
            alt="ShopHub"
            width={44}
            height={44}
            className={styles.brandMark}
            priority
          />
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>ShopHub</span>
            <span className={styles.brandSub}>Curated everyday commerce</span>
          </div>
        </Link>

        <div className={styles.searchWrap}>
          <SearchBar />
        </div>

        <HeaderActions />
      </div>
    </header>
  );
}
