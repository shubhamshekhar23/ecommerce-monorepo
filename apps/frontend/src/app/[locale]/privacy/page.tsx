import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ShopHub collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: "720px", margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Privacy Policy</h1>
      <p>
        <em>Last updated: June 2026</em>
      </p>

      <h2>1. Strictly Necessary Cookies</h2>
      <p>
        We set session and authentication cookies that are required for the site
        to function. These do not require your consent and cannot be disabled.
      </p>

      <h2>2. Analytics Cookies</h2>
      <p>
        With your consent, we use analytics tools (such as Google Analytics) to
        understand how visitors interact with the site. This data is aggregated
        and anonymous. You can withdraw consent at any time via the cookie
        banner.
      </p>

      <h2>3. Error Tracking</h2>
      <p>
        With your consent, we use error tracking software (such as Sentry) to
        detect and fix bugs. Error reports may include your browser version, OS,
        and the page where the error occurred.
      </p>

      <h2>4. Your Rights (GDPR)</h2>
      <p>
        If you are in the EU or UK, you have the right to access, rectify,
        erase, and restrict processing of your personal data. Contact us at{" "}
        <a href="mailto:privacy@shophub.example">privacy@shophub.example</a> to
        exercise these rights.
      </p>

      <h2>5. Do Not Track</h2>
      <p>
        If your browser sends a <code>DNT: 1</code> header, we automatically
        disable all non-essential cookies regardless of your stored preference.
      </p>

      <p>
        <em>
          Note: This is a learning project. In a real deployment, this page
          would be reviewed by a legal professional before publication.
        </em>
      </p>
    </main>
  );
}
