"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ReturnReason } from "../../interfaces";
import styles from "./ReturnForm.module.scss";

const REASONS: { value: ReturnReason; label: string }[] = [
  { value: "DEFECTIVE", label: "Item is defective or damaged" },
  { value: "WRONG_ITEM", label: "Wrong item received" },
  { value: "NOT_AS_DESCRIBED", label: "Not as described" },
  { value: "CHANGED_MIND", label: "Changed my mind" },
  { value: "OTHER", label: "Other" },
];

const schema = z.object({
  reason: z.enum([
    "DEFECTIVE",
    "WRONG_ITEM",
    "NOT_AS_DESCRIBED",
    "CHANGED_MIND",
    "OTHER",
  ]),
  description: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

interface ReturnFormProps {
  orderId: string;
  onSubmit: (values: FormValues & { orderId: string }) => void;
  isPending: boolean;
}

export function ReturnForm({ orderId, onSubmit, isPending }: ReturnFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "DEFECTIVE" },
  });

  return (
    <form
      onSubmit={handleSubmit((v) => onSubmit({ ...v, orderId }))}
      className={styles.form}
      noValidate
    >
      <div className={styles.field}>
        <label className={styles.label} htmlFor="reason">
          Reason for return
        </label>
        <select {...register("reason")} id="reason" className={styles.select}>
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {errors.reason && (
          <span className={styles.error}>{errors.reason.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="description">
          Additional details (optional)
        </label>
        <textarea
          {...register("description")}
          id="description"
          rows={4}
          placeholder="Describe the issue..."
          className={styles.textarea}
        />
      </div>

      <button type="submit" disabled={isPending} className={styles.submitBtn}>
        {isPending ? "Submitting..." : "Submit return request"}
      </button>
    </form>
  );
}
