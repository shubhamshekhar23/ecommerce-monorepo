"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormValues } from "../../utils/auth.schemas";
import { useLogin } from "../../hooks";
import { use2faVerify } from "@/features/auth";
import { resolveAuthError } from "../../utils/auth.utils";
import { Input } from "@/components/Form";
import { useAuthStore } from "@/store/auth.store";
import { API_URL } from "@/shared/config";
import { AuthSplitPanel } from "../AuthSplitPanel/AuthSplitPanel";
import styles from "./LoginForm.module.scss";

interface LoginFormProps {
  sessionExpired?: boolean;
}

const LOGIN_BENEFITS = [
  "Free shipping over $50",
  "30-day return window",
  "Early access to member deals",
];

export function LoginForm({ sessionExpired = false }: LoginFormProps) {
  const { mutate: login, isPending, error } = useLogin();
  const { mutate: verify2fa, isPending: isVerifying } = use2faVerify();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [twoFactorPending, setTwoFactorPending] = useState(false);
  const [tfaCode, setTfaCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (values: LoginFormValues): void => {
    login(
      { email: values.email, password: values.password },
      {
        onError: (err: unknown) => {
          // Backend returns 202 with requires2fa flag — detect via business error message
          if (err instanceof Error && err.message?.includes("2fa")) {
            setTwoFactorPending(true);
          }
        },
      },
    );
  };

  const handleTfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verify2fa(tfaCode, {
      onSuccess: async (tokens) => {
        const { default: apiClient } = await import("@/shared/apiClient");
        const res = await apiClient.get("/users/me");
        setAuth(res.data, tokens.accessToken, tokens.refreshToken);
        const callbackUrl =
          new URLSearchParams(window.location.search).get("callbackUrl") ?? "/";
        window.location.href = callbackUrl;
      },
    });
  };

  if (twoFactorPending) {
    return (
      <AuthSplitPanel
        badge="MEMBERS SAVE MORE"
        headline="Welcome back to quietly better shopping."
        body="Sign in to track orders, save favorites, and check out faster with saved details."
        benefits={LOGIN_BENEFITS}
      >
        <form onSubmit={handleTfaSubmit} className={styles.form} noValidate>
          <div className={styles.formHeader}>
            <h1 className={styles.title}>Two-factor verification</h1>
            <p className={styles.subtitle}>
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={tfaCode}
            onChange={(e) => setTfaCode(e.target.value.replace(/\D/g, ""))}
            className={styles.tfaInput}
            autoFocus
          />
          <button
            type="submit"
            disabled={isVerifying || tfaCode.length < 6}
            className={styles.submit}
          >
            {isVerifying ? "Verifying..." : "Verify"}
          </button>
        </form>
      </AuthSplitPanel>
    );
  }

  return (
    <AuthSplitPanel
      badge="MEMBERS SAVE MORE"
      headline="Welcome back to quietly better shopping."
      body="Sign in to track orders, save favorites, and check out faster with saved details."
      benefits={LOGIN_BENEFITS}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className={styles.form}
        noValidate
      >
        <div className={styles.formHeader}>
          <h1 className={styles.title}>Sign in</h1>
          <p className={styles.subtitle}>Enter your details to continue.</p>
        </div>

        {sessionExpired && (
          <div role="alert" className={styles.sessionExpiredBanner}>
            Your session expired. Please sign in again.
          </div>
        )}

        {error && (
          <div role="alert" className={styles.serverError}>
            {resolveAuthError(error, "Sign in failed. Please try again.")}
          </div>
        )}

        <Input
          {...register("email")}
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
        />

        <div className={styles.pwWrap}>
          <Input
            {...register("password")}
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className={styles.pwInput}
            error={errors.password?.message}
          />
          <button
            type="button"
            className={styles.showBtn}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "HIDE" : "SHOW"}
          </button>
        </div>

        <div className={styles.forgotRow}>
          <Link href="/forgot-password" className={styles.forgotLink}>
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={isPending} className={styles.submit}>
          {isPending ? "Signing in..." : "Sign in"}
        </button>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        <a href={`${API_URL}/auth/oauth/google`} className={styles.oauthBtn}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </a>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            New to us?{" "}
            <Link href="/register" className={styles.link}>
              Create your account
            </Link>
          </p>
        </div>
      </form>
    </AuthSplitPanel>
  );
}
