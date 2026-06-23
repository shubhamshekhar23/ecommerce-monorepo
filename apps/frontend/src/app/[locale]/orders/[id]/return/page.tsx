"use client";

import { use } from "react";
import Link from "next/link";
import { ReturnForm, useCreateReturn } from "@/features/returns";
import styles from "./page.module.scss";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ReturnRequestPage({ params }: Props) {
  const { id } = use(params);
  const { mutate: createReturn, isPending } = useCreateReturn();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href={`/orders/${id}`} className={styles.back}>
          ← Back to order
        </Link>
        <h1 className={styles.heading}>Request a return</h1>
        <p className={styles.sub}>
          Returns are accepted within 7 days of delivery. Once approved, a
          refund will be issued to your original payment method within 5–10
          business days.
        </p>
      </div>

      <div className={styles.formWrapper}>
        <ReturnForm
          orderId={id}
          onSubmit={createReturn}
          isPending={isPending}
        />
      </div>
    </div>
  );
}
