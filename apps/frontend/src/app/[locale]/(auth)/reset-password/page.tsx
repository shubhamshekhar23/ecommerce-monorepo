"use client";

import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/Form";
import { useResetPassword } from "@/features/auth";
import { passwordSchema } from "@/shared/validators";
import { AuthSplitPanel } from "@/features/auth";
import styles from "../auth.layout.module.scss";

const schema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

const BENEFITS = [
  "8 characters minimum",
  "Your saved cart and orders stay intact",
  "Sign in immediately after reset",
];

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { mutate, isPending } = useResetPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  if (!token) {
    return (
      <AuthSplitPanel
        badge="LINK EXPIRED"
        headline="This link is no longer valid."
        body="Password reset links expire after 1 hour for your security. Request a new one anytime."
        benefits={BENEFITS}
      >
        <div className={styles.form}>
          <h1 className={styles.title}>Invalid link</h1>
          <p>
            This password reset link is invalid or has expired. Please request a
            new one.
          </p>
        </div>
      </AuthSplitPanel>
    );
  }

  return (
    <AuthSplitPanel
      badge="ALMOST THERE"
      headline="Set a new password."
      body="Choose a strong password to keep your ShopHub account secure."
      benefits={BENEFITS}
    >
      <form
        onSubmit={handleSubmit((v) =>
          mutate({ token, newPassword: v.password }),
        )}
        className={styles.form}
        noValidate
      >
        <h1 className={styles.title}>Set new password</h1>

        <Input
          {...register("password")}
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
        />
        <Input
          {...register("confirmPassword")}
          id="confirmPassword"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
        />

        <button type="submit" disabled={isPending} className={styles.submit}>
          {isPending ? "Resetting..." : "Reset password"}
        </button>
      </form>
    </AuthSplitPanel>
  );
}
