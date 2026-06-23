"use client";

import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/Form";
import { useResetPassword } from "@/features/auth";
import { passwordSchema } from "@/shared/validators";
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
      <div className={styles.form}>
        <h1 className={styles.title}>Invalid link</h1>
        <p>
          This password reset link is invalid or has expired. Please request a
          new one.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((v) => mutate({ token, newPassword: v.password }))}
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
  );
}
