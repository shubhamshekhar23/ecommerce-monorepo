"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registerSchema,
  type RegisterFormValues,
} from "../../utils/auth.schemas";
import { useRegister } from "../../hooks";
import { resolveAuthError } from "../../utils/auth.utils";
import { Input } from "@/components/Form";
import { AuthSplitPanel } from "../AuthSplitPanel/AuthSplitPanel";
import styles from "./RegisterForm.module.scss";

const REGISTER_BENEFITS = [
  "Save items and check out faster",
  "Track every order in one place",
  "Early access to member deals",
];

export function RegisterForm() {
  const { mutate: register, isPending, error } = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (values: RegisterFormValues): void => {
    const { confirmPassword: _confirmPassword, ...payload } = values;
    register(payload);
  };

  return (
    <AuthSplitPanel
      badge="JOIN SHOPHUB"
      headline="Create an account in under a minute."
      body="One account for faster checkout, order tracking, saved favorites, and member-only deals."
      benefits={REGISTER_BENEFITS}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className={styles.form}
        noValidate
      >
        <div className={styles.formHeader}>
          <h1 className={styles.title}>Create account</h1>
          <p className={styles.subtitle}>
            Join ShopHub — it only takes a moment.
          </p>
        </div>

        {error && (
          <div role="alert" className={styles.serverError}>
            {resolveAuthError(error, "Registration failed. Please try again.")}
          </div>
        )}

        <div className={styles.nameRow}>
          <Input
            {...formRegister("firstName")}
            id="firstName"
            label="First name"
            type="text"
            autoComplete="given-name"
            error={errors.firstName?.message}
          />
          <Input
            {...formRegister("lastName")}
            id="lastName"
            label="Last name"
            type="text"
            autoComplete="family-name"
            error={errors.lastName?.message}
          />
        </div>

        <Input
          {...formRegister("email")}
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
        />

        <div className={styles.pwWrap}>
          <Input
            {...formRegister("password")}
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
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

        <div className={styles.pwWrap}>
          <Input
            {...formRegister("confirmPassword")}
            id="confirmPassword"
            label="Confirm password"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            className={styles.pwInput}
            error={errors.confirmPassword?.message}
          />
          <button
            type="button"
            className={styles.showBtn}
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={
              showConfirm ? "Hide confirm password" : "Show confirm password"
            }
          >
            {showConfirm ? "HIDE" : "SHOW"}
          </button>
        </div>

        <button type="submit" disabled={isPending} className={styles.submit}>
          {isPending ? "Creating account..." : "Create account"}
        </button>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Already have an account?{" "}
            <Link href="/login" className={styles.link}>
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </AuthSplitPanel>
  );
}
