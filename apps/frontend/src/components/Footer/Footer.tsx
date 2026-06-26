import Link from "next/link";
import { BackToTopButton } from "./BackToTopButton";
import styles from "./Footer.module.scss";

const FOOTER_LINKS = {
  Shop: [
    { label: "Browse Products", href: "/products" },
    { label: "Today's Deals", href: "/deals" },
    { label: "New Arrivals", href: "/new" },
  ],
  Account: [
    { label: "Your Orders", href: "/orders" },
    { label: "Your Cart", href: "/cart" },
    { label: "Sign In", href: "/login" },
  ],
  Support: [
    { label: "Help Center", href: "/help" },
    { label: "Shipping Info", href: "/shipping" },
    { label: "Contact Us", href: "/contact" },
    { label: "Privacy Policy", href: "/privacy" },
  ],
};

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.columns}>
          {/* Brand column */}
          <div className={styles.brandColumn}>
            <div className={styles.brandLockup}>
              <span className={styles.brandMark}>S</span>
              <span className={styles.brandName}>ShopHub</span>
            </div>
            <p className={styles.tagline}>
              Elevated shopping for everyday essentials and standout finds.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading} className={styles.column}>
              <h4 className={styles.eyebrow}>{heading}</h4>
              <ul className={styles.list}>
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={styles.link}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className={styles.bottom}>
          <span>
            © {new Date().getFullYear()} ShopHub. All rights reserved.
          </span>
          <BackToTopButton />
        </div>
      </div>
    </footer>
  );
}
