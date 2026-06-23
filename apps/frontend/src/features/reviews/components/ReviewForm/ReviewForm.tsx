"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import styles from "./ReviewForm.module.scss";

const schema = z.object({
  rating: z.number().min(1).max(5),
  comment: z
    .string()
    .min(10, "Review must be at least 10 characters")
    .max(2000),
});

type FormValues = z.infer<typeof schema>;

interface ReviewFormProps {
  onSubmit: (values: FormValues) => void;
  onCancel?: () => void;
  isPending: boolean;
  initial?: { rating: number; comment: string };
}

export function ReviewForm({
  onSubmit,
  onCancel,
  isPending,
  initial,
}: ReviewFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? { rating: 5, comment: "" },
  });

  const rating = useWatch({ control, name: "rating" });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
      <div className={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setValue("rating", star, { shouldValidate: true })}
            className={star <= rating ? styles.starActive : styles.star}
            aria-label={`Rate ${star} out of 5`}
          >
            ★
          </button>
        ))}
        {errors.rating && (
          <span className={styles.error}>{errors.rating.message}</span>
        )}
      </div>

      <textarea
        {...register("comment")}
        rows={4}
        placeholder="Share your experience with this product..."
        className={styles.textarea}
      />
      {errors.comment && (
        <span className={styles.error}>{errors.comment.message}</span>
      )}

      <div className={styles.actions}>
        <button type="submit" disabled={isPending} className={styles.submitBtn}>
          {isPending ? "Submitting..." : "Submit review"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={styles.cancelBtn}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
