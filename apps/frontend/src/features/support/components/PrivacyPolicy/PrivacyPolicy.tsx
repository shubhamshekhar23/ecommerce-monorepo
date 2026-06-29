import styles from "./PrivacyPolicy.module.scss";

const SECTIONS = [
  {
    title: "Strictly Necessary Cookies",
    body: "We set session and authentication cookies required for the site to function. These do not require your consent and cannot be disabled.",
  },
  {
    title: "Analytics Cookies",
    body: "With your consent, we use analytics tools (such as Google Analytics) to understand how visitors interact with the site. This data is aggregated and anonymous. You can withdraw consent at any time via the cookie banner.",
  },
  {
    title: "Error Tracking",
    body: "With your consent, we use error tracking software (such as Sentry) to detect and fix bugs. Error reports may include your browser version, OS, and the page where the error occurred.",
  },
  {
    title: "Your Rights (GDPR)",
    body: "If you are in the EU or UK, you have the right to access, rectify, erase, and restrict processing of your personal data. Contact us at privacy@shophub.example to exercise these rights.",
  },
  {
    title: "Do Not Track",
    body: "If your browser sends a DNT: 1 header, we automatically disable all non-essential cookies regardless of your stored preference.",
  },
];

export function PrivacyPolicy() {
  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Legal</p>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.meta}>Last updated: June 2026</p>
      </div>

      <div className={styles.content}>
        <p className={styles.intro}>
          ShopHub is committed to protecting your privacy. This policy explains
          what data we collect, why we collect it, and how you can control it.
        </p>

        <ol className={styles.sections}>
          {SECTIONS.map((section, i) => (
            <li key={section.title} className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.number}>{i + 1}.</span>
                {section.title}
              </h2>
              <p className={styles.sectionBody}>{section.body}</p>
            </li>
          ))}
        </ol>

        <p className={styles.disclaimer}>
          This is a learning project. In a real deployment, this policy would be
          reviewed by a legal professional before publication.
        </p>
      </div>
    </main>
  );
}
