import styles from "./HelpCenter.module.scss";

const FAQ_SECTIONS = [
  {
    heading: "Orders & Shipping",
    icon: "📦",
    items: [
      {
        q: "When will my order arrive?",
        a: "Standard shipping takes 3–5 business days. Express orders placed before 2 PM arrive within 1–2 business days. You'll receive a tracking link by email as soon as your order ships.",
      },
      {
        q: "Can I change or cancel my order?",
        a: "You can cancel or modify your order within 1 hour of placing it. After that, the order enters our fulfilment pipeline and can no longer be changed. Contact support immediately if you need help.",
      },
      {
        q: "Do you offer free shipping?",
        a: "Yes — standard shipping is free on all orders over $50. Orders below that threshold incur a flat $4.99 fee.",
      },
    ],
  },
  {
    heading: "Returns & Refunds",
    icon: "↩️",
    items: [
      {
        q: "What is your return policy?",
        a: "We accept returns within 7 days of delivery for most items. The product must be unused and in its original packaging. Gift cards and personalised items are non-refundable.",
      },
      {
        q: "How long does a refund take?",
        a: "Once we receive and inspect the return, refunds are processed within 2 business days. It can then take 3–5 additional days for the amount to appear on your statement depending on your bank.",
      },
      {
        q: "Who pays for return shipping?",
        a: "If the item arrived damaged or we sent the wrong product, we cover return shipping. For change-of-mind returns, a $4.99 return label fee is deducted from your refund.",
      },
    ],
  },
  {
    heading: "Account & Payments",
    icon: "💳",
    items: [
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit and debit cards (Visa, Mastercard, Amex), Apple Pay, and Google Pay, all processed securely through Stripe.",
      },
      {
        q: "Is my payment information stored?",
        a: "No. We never store your card details. All payment processing is handled by Stripe, which is PCI DSS Level 1 certified — the highest level of payment security.",
      },
      {
        q: "How do I reset my password?",
        a: 'Click "Sign In" and then "Forgot password". Enter your email and we\'ll send you a reset link valid for 30 minutes.',
      },
    ],
  },
];

export function HelpCenter() {
  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Support</p>
        <h1 className={styles.title}>How can we help?</h1>
        <p className={styles.subtitle}>
          Find answers to the most common questions below.
        </p>
      </div>

      <div className={styles.sections}>
        {FAQ_SECTIONS.map((section) => (
          <section key={section.heading} className={styles.section}>
            <h2 className={styles.sectionHeading}>
              <span className={styles.icon}>{section.icon}</span>
              {section.heading}
            </h2>
            <div className={styles.faqs}>
              {section.items.map((item) => (
                <details key={item.q} className={styles.faq}>
                  <summary className={styles.question}>{item.q}</summary>
                  <p className={styles.answer}>{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
