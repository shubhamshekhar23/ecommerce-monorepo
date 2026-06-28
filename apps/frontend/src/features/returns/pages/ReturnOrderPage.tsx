"use client";

import Link from "next/link";
import { ReturnForm, useCreateReturn } from "@/features/returns";
import styles from "./ReturnOrderPage.module.scss";

interface Props {
  orderId: string;
}

export function ReturnOrderPage({ orderId }: Props) {
  const { mutate: createReturn, isPending } = useCreateReturn();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href={`/orders/${orderId}`} className={styles.back}>
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
          orderId={orderId}
          onSubmit={createReturn}
          isPending={isPending}
        />
      </div>
    </div>
  );
}
