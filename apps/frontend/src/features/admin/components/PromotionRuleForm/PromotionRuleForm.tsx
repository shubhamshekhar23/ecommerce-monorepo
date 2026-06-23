"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { PromotionRule } from "../../api/admin-promotions.api";
import styles from "./PromotionRuleForm.module.scss";

const ACTION_TYPES = [
  "percentage_discount",
  "fixed_discount",
  "free_shipping",
  "free_item",
] as const;

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  priority: z.number().int().min(0).max(100),
  stackable: z.boolean(),
  conditionDsl: z.string().optional(),
  minOrderValue: z.number().optional(),
  maxOrderValue: z.number().optional(),
  customerTier: z.string().optional(),
  categoryId: z.string().optional(),
  minQuantity: z.number().int().optional(),
  isFirstOrder: z.boolean().optional(),
  couponCode: z.string().optional(),
  actionType: z.enum(ACTION_TYPES),
  actionValue: z.number().min(0).optional(),
});

type FormValues = z.infer<typeof schema>;

interface PromotionRuleFormProps {
  initial?: PromotionRule;
  onSubmit: (values: FormValues) => void;
  isPending: boolean;
}

function buildCondition(v: FormValues): Record<string, unknown> {
  const cond: Record<string, unknown> = {};
  if (v.minOrderValue !== undefined) cond.minOrderValue = v.minOrderValue;
  if (v.maxOrderValue !== undefined) cond.maxOrderValue = v.maxOrderValue;
  if (v.customerTier) cond.customerTier = v.customerTier;
  if (v.categoryId) cond.categoryId = v.categoryId;
  if (v.minQuantity !== undefined) cond.minQuantity = v.minQuantity;
  if (v.isFirstOrder) cond.isFirstOrder = true;
  if (v.couponCode) cond.couponCode = v.couponCode;
  return cond;
}

function getDefaults(initial?: PromotionRule): FormValues {
  if (!initial) {
    return {
      name: "",
      description: "",
      priority: 0,
      stackable: false,
      conditionDsl: "",
      actionType: "percentage_discount",
      actionValue: 0,
    };
  }
  const cond = initial.condition as Record<string, unknown>;
  const action = initial.action as Record<string, unknown>;
  return {
    name: initial.name,
    description: initial.description ?? "",
    priority: initial.priority,
    stackable: initial.stackable,
    conditionDsl: initial.conditionDsl ?? "",
    minOrderValue:
      typeof cond.minOrderValue === "number" ? cond.minOrderValue : undefined,
    maxOrderValue:
      typeof cond.maxOrderValue === "number" ? cond.maxOrderValue : undefined,
    customerTier:
      typeof cond.customerTier === "string" ? cond.customerTier : undefined,
    categoryId:
      typeof cond.categoryId === "string" ? cond.categoryId : undefined,
    minQuantity:
      typeof cond.minQuantity === "number" ? cond.minQuantity : undefined,
    isFirstOrder: cond.isFirstOrder === true,
    couponCode:
      typeof cond.couponCode === "string" ? cond.couponCode : undefined,
    actionType:
      (action.type as (typeof ACTION_TYPES)[number]) ?? "percentage_discount",
    actionValue: typeof action.value === "number" ? action.value : 0,
  };
}

export function PromotionRuleForm({
  initial,
  onSubmit,
  isPending,
}: PromotionRuleFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(initial),
  });

  const actionType = useWatch({ control, name: "actionType" });
  const conditionDsl = useWatch({ control, name: "conditionDsl" });

  const handleFormSubmit = (v: FormValues) => {
    const condition = v.conditionDsl?.trim() ? {} : buildCondition(v);
    onSubmit({
      ...v,
      condition,
    } as FormValues);
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className={styles.form}
      noValidate
    >
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Basic</h2>
        <div className={styles.field}>
          <label className={styles.label}>Name *</label>
          <input {...register("name")} className={styles.input} />
          {errors.name && (
            <span className={styles.error}>{errors.name.message}</span>
          )}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Description</label>
          <input {...register("description")} className={styles.input} />
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Priority (0–100)</label>
            <input
              type="number"
              {...register("priority", { valueAsNumber: true })}
              className={styles.input}
              min={0}
              max={100}
            />
          </div>
          <div className={styles.checkField}>
            <input type="checkbox" {...register("stackable")} id="stackable" />
            <label htmlFor="stackable" className={styles.checkLabel}>
              Stackable with other rules
            </label>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Condition</h2>
        <p className={styles.hint}>
          Fill the fields below, or use the DSL textarea. The DSL takes
          precedence when provided.
        </p>

        <div className={styles.conditionGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Min order value ($)</label>
            <input
              type="number"
              {...register("minOrderValue", { valueAsNumber: true })}
              className={styles.input}
              min={0}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Max order value ($)</label>
            <input
              type="number"
              {...register("maxOrderValue", { valueAsNumber: true })}
              className={styles.input}
              min={0}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Customer tier</label>
            <input
              {...register("customerTier")}
              placeholder="e.g. GOLD"
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Category ID</label>
            <input {...register("categoryId")} className={styles.input} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Min quantity</label>
            <input
              type="number"
              {...register("minQuantity", { valueAsNumber: true })}
              className={styles.input}
              min={1}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Coupon code</label>
            <input {...register("couponCode")} className={styles.input} />
          </div>
          <div className={styles.checkField}>
            <input
              type="checkbox"
              {...register("isFirstOrder")}
              id="isFirstOrder"
            />
            <label htmlFor="isFirstOrder" className={styles.checkLabel}>
              First order only
            </label>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            Rule DSL (optional — overrides condition builder)
          </label>
          <textarea
            {...register("conditionDsl")}
            rows={3}
            placeholder='IF order.subtotal > 100 AND customer.tier == "GOLD" THEN discount(percentage: 15)'
            className={`${styles.textarea} ${conditionDsl?.trim() ? styles.dslActive : ""}`}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Action</h2>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Type</label>
            <select {...register("actionType")} className={styles.select}>
              <option value="percentage_discount">Percentage discount</option>
              <option value="fixed_discount">Fixed discount ($)</option>
              <option value="free_shipping">Free shipping</option>
              <option value="free_item">Free item</option>
            </select>
          </div>
          {actionType !== "free_shipping" && (
            <div className={styles.field}>
              <label className={styles.label}>
                Value {actionType === "percentage_discount" ? "(%)" : "($)"}
              </label>
              <input
                type="number"
                {...register("actionValue", { valueAsNumber: true })}
                className={styles.input}
                min={0}
              />
            </div>
          )}
        </div>
      </section>

      <div className={styles.footer}>
        <button type="submit" disabled={isPending} className={styles.submitBtn}>
          {isPending ? "Saving..." : initial ? "Save changes" : "Create rule"}
        </button>
      </div>
    </form>
  );
}
