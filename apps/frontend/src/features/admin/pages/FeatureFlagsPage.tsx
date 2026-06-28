"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useFeatureFlags,
  useCreateFeatureFlag,
  useUpdateFeatureFlag,
  useDeleteFeatureFlag,
} from "@/features/admin";
import { AdminTableSkeleton } from "@/features/admin";
import styles from "./FeatureFlagsPage.module.scss";

const createSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Lowercase kebab-case only (a-z, 0-9, -)"),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;

export function FeatureFlagsPage() {
  const { data: flags, isLoading } = useFeatureFlags();
  const { mutate: create, isPending: isCreating } = useCreateFeatureFlag();
  const { mutate: update } = useUpdateFeatureFlag();
  const { mutate: del } = useDeleteFeatureFlag();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { enabled: true, rolloutPercentage: 100 },
  });

  function onSubmit(values: CreateFormValues) {
    create(values, {
      onSuccess: () => {
        reset();
        setShowForm(false);
      },
    });
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Feature Flags</h1>
        <button
          className={styles.addBtn}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancel" : "+ New Flag"}
        </button>
      </div>

      {showForm && (
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <h2 className={styles.formTitle}>Create Feature Flag</h2>
          <div className={styles.formRow}>
            <label className={styles.label}>
              Name (kebab-case)
              <input
                className={styles.input}
                {...register("name")}
                placeholder="new-checkout-flow"
              />
              {errors.name && (
                <span className={styles.fieldError}>{errors.name.message}</span>
              )}
            </label>
            <label className={styles.label}>
              Description
              <input
                className={styles.input}
                {...register("description")}
                placeholder="Optional description"
              />
            </label>
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>
              Rollout % (0–100)
              <input
                className={styles.input}
                type="number"
                min={0}
                max={100}
                {...register("rolloutPercentage", { valueAsNumber: true })}
              />
              {errors.rolloutPercentage && (
                <span className={styles.fieldError}>
                  {errors.rolloutPercentage.message}
                </span>
              )}
            </label>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                className={styles.checkbox}
                {...register("enabled")}
              />
              Enabled on create
            </label>
          </div>
          <button
            className={styles.submitBtn}
            type="submit"
            disabled={isCreating}
          >
            {isCreating ? "Creating…" : "Create Flag"}
          </button>
        </form>
      )}

      {isLoading && <AdminTableSkeleton rows={4} columns={5} />}
      {!isLoading && !flags?.length && (
        <p className={styles.empty}>No feature flags yet.</p>
      )}
      {!isLoading && !!flags?.length && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Rollout %</th>
                <th>Enabled</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((flag) => (
                <tr key={flag.name}>
                  <td className={styles.flagName}>{flag.name}</td>
                  <td className={styles.desc}>{flag.description ?? "—"}</td>
                  <td className={styles.rollout}>{flag.rolloutPercentage}%</td>
                  <td>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={flag.enabled}
                      onChange={(e) =>
                        update({
                          name: flag.name,
                          payload: { enabled: e.target.checked },
                        })
                      }
                    />
                  </td>
                  <td>
                    {deleteConfirm === flag.name ? (
                      <div className={styles.confirmRow}>
                        <button
                          className={styles.confirmYes}
                          onClick={() =>
                            del(flag.name, {
                              onSettled: () => setDeleteConfirm(null),
                            })
                          }
                        >
                          Delete
                        </button>
                        <button
                          className={styles.confirmNo}
                          onClick={() => setDeleteConfirm(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className={styles.deleteBtn}
                        onClick={() => setDeleteConfirm(flag.name)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
