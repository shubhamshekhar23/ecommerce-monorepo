"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/Form";
import { useForgotPassword } from "@/features/auth";
import { emailSchema } from "@/shared/validators";
import styles from "../auth.layout.module.scss";

const schema = z.object({ email: emailSchema });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const { mutate, isPending } = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  if (submitted) {
    return (
      <div className={styles.form}>
        <h1 className={styles.title}>Check your email</h1>
        <p>
          If an account exists for that email, we sent a password reset link. It
          expires in 1 hour.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((v) =>
        mutate(v.email, { onSuccess: () => setSubmitted(true) }),
      )}
      className={styles.form}
      noValidate
    >
      <h1 className={styles.title}>Forgot password</h1>
      <p>Enter your email and we&apos;ll send you a reset link.</p>

      <Input
        {...register("email")}
        id="email"
        label="Email address"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
      />

      <button type="submit" disabled={isPending} className={styles.submit}>
        {isPending ? "Sending..." : "Send reset link"}
      </button>
    </form>
  );
}
