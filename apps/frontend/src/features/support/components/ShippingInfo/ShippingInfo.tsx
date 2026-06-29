import styles from "./ShippingInfo.module.scss";

const SHIPPING_OPTIONS = [
  {
    name: "Standard Shipping",
    price: "Free over $50 · $4.99 below",
    days: "3–5 business days",
    icon: "🚚",
    highlight: false,
  },
  {
    name: "Express Shipping",
    price: "$12.99",
    days: "1–2 business days",
    icon: "⚡",
    highlight: true,
  },
  {
    name: "International",
    price: "From $19.99",
    days: "7–14 business days",
    icon: "🌍",
    highlight: false,
  },
];

const POLICIES = [
  { label: "Order cut-off", value: "Orders placed before 2 PM ship same day" },
  { label: "Weekend orders", value: "Processed on the next business day" },
  {
    label: "Tracking",
    value: "Email with tracking link sent when order ships",
  },
  { label: "Signature", value: "Required for orders over $200" },
];

export function ShippingInfo() {
  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Shipping</p>
        <h1 className={styles.title}>Delivery options</h1>
        <p className={styles.subtitle}>
          Fast, reliable shipping to your door. Free standard delivery on all
          orders over $50.
        </p>
      </div>

      <div className={styles.cards}>
        {SHIPPING_OPTIONS.map((opt) => (
          <div
            key={opt.name}
            className={`${styles.card} ${opt.highlight ? styles.cardHighlight : ""}`}
          >
            <span className={styles.cardIcon}>{opt.icon}</span>
            <h2 className={styles.cardName}>{opt.name}</h2>
            <p className={styles.cardDays}>{opt.days}</p>
            <p className={styles.cardPrice}>{opt.price}</p>
          </div>
        ))}
      </div>

      <section className={styles.policies}>
        <h2 className={styles.policiesHeading}>Good to know</h2>
        <dl className={styles.policyList}>
          {POLICIES.map((p) => (
            <div key={p.label} className={styles.policyRow}>
              <dt className={styles.policyLabel}>{p.label}</dt>
              <dd className={styles.policyValue}>{p.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className={styles.freeShippingBanner}>
        <span className={styles.bannerIcon}>🎉</span>
        <p>
          Spend <strong>$50 or more</strong> and standard shipping is on us —
          always.
        </p>
      </div>
    </main>
  );
}
