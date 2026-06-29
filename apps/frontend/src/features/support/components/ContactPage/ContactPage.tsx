import Link from "next/link";
import styles from "./ContactPage.module.scss";

const CONTACT_CARDS = [
  {
    icon: "✉️",
    heading: "Email support",
    detail: "support@shophub.example",
    note: "We aim to reply within 24 hours",
    href: "mailto:support@shophub.example",
    cta: "Send an email",
  },
  {
    icon: "🕐",
    heading: "Support hours",
    detail: "Mon – Fri · 9 AM – 6 PM GMT",
    note: "Closed on UK public holidays",
    href: null,
    cta: null,
  },
  {
    icon: "⚡",
    heading: "Urgent issues",
    detail: "Orders & delivery problems",
    note: "Mention your order number for fastest resolution",
    href: "mailto:urgent@shophub.example",
    cta: "Contact urgent support",
  },
];

export function ContactPage() {
  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Contact</p>
        <h1 className={styles.title}>Get in touch</h1>
        <p className={styles.subtitle}>
          Our support team is here to help. Reach out and we&apos;ll get back to
          you as quickly as possible.
        </p>
      </div>

      <div className={styles.cards}>
        {CONTACT_CARDS.map((card) => (
          <div key={card.heading} className={styles.card}>
            <span className={styles.cardIcon}>{card.icon}</span>
            <h2 className={styles.cardHeading}>{card.heading}</h2>
            <p className={styles.cardDetail}>{card.detail}</p>
            <p className={styles.cardNote}>{card.note}</p>
            {card.href && card.cta && (
              <a href={card.href} className={styles.cardCta}>
                {card.cta}
              </a>
            )}
          </div>
        ))}
      </div>

      <div className={styles.helpPrompt}>
        <p className={styles.helpText}>Looking for quick answers?</p>
        <Link href="/help" className={styles.helpLink}>
          Browse the Help Center →
        </Link>
      </div>
    </main>
  );
}
