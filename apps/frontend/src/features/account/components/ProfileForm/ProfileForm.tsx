"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/Form";
import { useUpdateProfile } from "../../hooks/useUpdateProfile";
import { nameSchema, emailSchema } from "@/shared/validators";
import type { User } from "@/store/auth.store";
import styles from "./ProfileForm.module.scss";

const profileSchema = z.object({
  firstName: nameSchema("First name"),
  lastName: nameSchema("Last name"),
  email: emailSchema,
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  user: User;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const { mutate, isPending } = useUpdateProfile();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => mutate(v))} className={styles.form}>
      <h2 className={styles.heading}>Profile</h2>

      <div className={styles.row}>
        <Input
          {...register("firstName")}
          id="firstName"
          label="First name"
          autoComplete="given-name"
          error={errors.firstName?.message}
        />
        <Input
          {...register("lastName")}
          id="lastName"
          label="Last name"
          autoComplete="family-name"
          error={errors.lastName?.message}
        />
      </div>

      <Input
        {...register("email")}
        id="email"
        label="Email address"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
      />

      <button type="submit" disabled={isPending} className={styles.submit}>
        {isPending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
