"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { use2faSetup, use2faEnable, use2faDisable } from "@/features/auth";
import { useAuthStore } from "@/store/auth.store";
import styles from "./SecurityPage.module.scss";

export function SecurityPage() {
  const user = useAuthStore((s) => s.user);
  const [phase, setPhase] = useState<
    "idle" | "setup" | "enabled" | "disabling"
  >(user?.totpEnabled ? "enabled" : "idle");
  const [setupData, setSetupData] = useState<{
    uri: string;
    secret: string;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const { mutate: setup, isPending: isSettingUp } = use2faSetup();
  const { mutate: enable, isPending: isEnabling } = use2faEnable();
  const { mutate: disable, isPending: isDisabling } = use2faDisable();

  useEffect(() => {
    if (!setupData?.uri) return;
    QRCode.toDataURL(setupData.uri, { width: 180, margin: 1 }).then(
      setQrDataUrl,
    );
  }, [setupData?.uri]);

  const handleSetup = () => {
    setup(undefined, {
      onSuccess: (data) => {
        setSetupData({ uri: data.uri, secret: data.secret });
        setPhase("setup");
      },
    });
  };

  const handleEnable = () => {
    enable(code, {
      onSuccess: () => {
        setCode("");
        setPhase("enabled");
      },
    });
  };

  const handleDisable = () => {
    disable(code, {
      onSuccess: () => {
        setCode("");
        setSetupData(null);
        setQrDataUrl(null);
        setPhase("idle");
      },
    });
  };

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>Security</h2>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Two-factor authentication (2FA)</h3>

        {phase === "idle" && (
          <>
            <p className={styles.body}>
              Add a second layer of security to your account. You&apos;ll need
              an authenticator app (Google Authenticator, Authy, etc.) to set
              this up.
            </p>
            <button
              onClick={handleSetup}
              disabled={isSettingUp}
              className={styles.primaryBtn}
            >
              {isSettingUp ? "Setting up..." : "Enable 2FA"}
            </button>
          </>
        )}

        {phase === "setup" && setupData && (
          <div className={styles.setupBox}>
            <p className={styles.body}>
              Scan this QR code with your authenticator app:
            </p>
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="2FA QR code" width={180} height={180} />
            ) : (
              <div
                className={styles.qrPlaceholder}
                aria-label="Loading QR code"
              />
            )}
            <p className={styles.body}>Or enter this secret manually:</p>
            <code className={styles.secret}>{setupData.secret}</code>
            <p className={styles.body}>
              Then enter the 6-digit code from the app to verify:
            </p>
            <div className={styles.codeRow}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className={styles.codeInput}
              />
              <button
                onClick={handleEnable}
                disabled={isEnabling || code.length < 6}
                className={styles.primaryBtn}
              >
                {isEnabling ? "Verifying..." : "Verify & activate"}
              </button>
            </div>
          </div>
        )}

        {phase === "enabled" && (
          <div className={styles.successBox}>
            <p className={styles.successText}>2FA is now active.</p>
            <p className={styles.body}>
              Your account is now protected with two-factor authentication.
            </p>
            <button
              onClick={() => setPhase("disabling")}
              className={styles.dangerBtn}
            >
              Disable 2FA
            </button>
          </div>
        )}

        {phase === "disabling" && (
          <div className={styles.setupBox}>
            <p className={styles.body}>
              Enter your 6-digit code to confirm disabling 2FA:
            </p>
            <div className={styles.codeRow}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className={styles.codeInput}
              />
              <button
                onClick={handleDisable}
                disabled={isDisabling || code.length < 6}
                className={styles.dangerBtn}
              >
                {isDisabling ? "Disabling..." : "Confirm disable"}
              </button>
              <button
                onClick={() => {
                  setPhase("enabled");
                  setCode("");
                }}
                className={styles.secondaryBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
