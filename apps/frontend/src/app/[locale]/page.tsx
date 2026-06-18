import Link from "next/link";
import { getTranslations } from "next-intl/server";
import styles from "./page.module.scss";

const FEATURED = [
  { title: "Smart Home Essentials", href: "/products?category=smart-home" },
  { title: "Everyday Tech", href: "/products?category=electronics" },
  { title: "Wellness Picks", href: "/products?category=health" },
];

export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>{t("eyebrow")}</p>
          <h1>{t("headline")}</h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
          <div className={styles.actions}>
            <Link href="/products" className={styles.primaryCta}>
              {t("exploreCta")}
            </Link>
            <Link href="/products?filter=deals" className={styles.secondaryCta}>
              {t("dealsCta")}
            </Link>
          </div>
        </div>
        <div className={styles.heroPanel}>
          <p>{t("trustedBy")}</p>
          <ul>
            <li>{t("fastDelivery")}</li>
            <li>{t("secureCheckout")}</li>
            <li>{t("flexibleReturns")}</li>
          </ul>
        </div>
      </section>

      <section className={styles.valueStrip}>
        <p>{t("freeShipping")}</p>
        <p>{t("returnWindow")}</p>
        <p>{t("support")}</p>
      </section>

      <section className={styles.featured}>
        <h2>{t("featuredTitle")}</h2>
        <div className={styles.cards}>
          {FEATURED.map((item) => (
            <Link key={item.title} href={item.href} className={styles.card}>
              <h3>{item.title}</h3>
              <span>{t("shopNow")}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
