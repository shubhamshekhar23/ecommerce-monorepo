"use client";

import { useOAuthCallback } from "@/features/auth";

export default function OAuthCallbackPage() {
  useOAuthCallback();
  return (
    <div style={{ padding: "var(--space-10)", textAlign: "center" }}>
      <p>Signing you in...</p>
    </div>
  );
}
