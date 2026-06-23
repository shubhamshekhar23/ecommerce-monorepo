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
import styles from "./LoginForm.module.scss";

interface LoginFormProps {
  sessionExpired?: boolean;
}

export function LoginForm({ sessionExpired = false }: LoginFormProps) {
  const { mutate: login, isPending, error } = useLogin();
  const { mutate: verify2fa, isPending: isVerifying } = use2faVerify();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [twoFactorPending, setTwoFactorPending] = useState(false);
  const [tfaCode, setTfaCode] = useState("");

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
      <form onSubmit={handleTfaSubmit} className={styles.form} noValidate>
        <h1 className={styles.title}>Two-factor verification</h1>
        <p>Enter the 6-digit code from your authenticator app.</p>
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
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
      <h1 className={styles.title}>Sign in</h1>

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

      <div className={styles.passwordField}>
        <Input
          {...register("password")}
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
        />
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
  );
}
