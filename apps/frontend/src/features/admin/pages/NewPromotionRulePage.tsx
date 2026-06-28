"use client";

import { useRouter } from "next/navigation";
import { PromotionRuleForm, useCreatePromotionRule } from "@/features/admin";
import { Breadcrumb } from "@/components/Breadcrumb/Breadcrumb";

export function NewPromotionRulePage() {
  const router = useRouter();
  const { mutate: create, isPending } = useCreatePromotionRule();

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Promotion Rules", href: "/admin/promotion-rules" },
          { label: "New Rule" },
        ]}
      />
      <PromotionRuleForm
        isPending={isPending}
        onSubmit={(values) => {
          const condition = values.conditionDsl?.trim()
            ? {}
            : Object.fromEntries(
                Object.entries({
                  minOrderValue: values.minOrderValue,
                  maxOrderValue: values.maxOrderValue,
                  customerTier: values.customerTier,
                  categoryId: values.categoryId,
                  minQuantity: values.minQuantity,
                  isFirstOrder: values.isFirstOrder,
                  couponCode: values.couponCode,
                }).filter(
                  ([, v]) => v !== undefined && v !== "" && v !== false,
                ),
              );
          create(
            {
              name: values.name,
              description: values.description,
              priority: values.priority,
              stackable: values.stackable,
              conditionDsl: values.conditionDsl,
              condition,
              action: { type: values.actionType, value: values.actionValue },
            },
            { onSuccess: () => router.push("/admin/promotion-rules") },
          );
        }}
      />
    </>
  );
}
