"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import {
  usePromotionRules,
  useUpdatePromotionRule,
  PromotionRuleForm,
} from "@/features/admin";
import { Breadcrumb } from "@/components/Breadcrumb/Breadcrumb";

export default function EditPromotionRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: rules, isLoading } = usePromotionRules();
  const rule = rules?.find((r) => r.id === id);
  const { mutate: update, isPending } = useUpdatePromotionRule();

  if (isLoading) {
    return <div style={{ padding: "24px" }}>Loading...</div>;
  }
  if (!rule) {
    return (
      <div style={{ padding: "24px", color: "#cb2431" }}>Rule not found.</div>
    );
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Promotion Rules", href: "/admin/promotion-rules" },
          { label: `Edit: ${rule.name}` },
        ]}
      />
      <PromotionRuleForm
        initial={rule}
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
          update(
            {
              id,
              payload: {
                name: values.name,
                description: values.description,
                priority: values.priority,
                stackable: values.stackable,
                conditionDsl: values.conditionDsl,
                condition,
                action: { type: values.actionType, value: values.actionValue },
              },
            },
            { onSuccess: () => router.push("/admin/promotion-rules") },
          );
        }}
      />
    </>
  );
}
