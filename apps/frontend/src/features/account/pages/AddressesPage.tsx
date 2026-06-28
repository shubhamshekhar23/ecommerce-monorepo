"use client";

import { useState } from "react";
import {
  useAddresses,
  useCreateAddress,
  AddressCard,
  AddressForm,
} from "@/features/addresses";
import styles from "./AddressesPage.module.scss";

export function AddressesPage() {
  const [showNew, setShowNew] = useState(false);
  const { data: addresses, isLoading } = useAddresses();
  const { mutate: createAddress, isPending } = useCreateAddress();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Saved addresses</h2>
        {!showNew && (
          <button onClick={() => setShowNew(true)} className={styles.addBtn}>
            + Add address
          </button>
        )}
      </div>

      {showNew && (
        <div className={styles.newForm}>
          <AddressForm
            onSubmit={(v) =>
              createAddress(v, { onSuccess: () => setShowNew(false) })
            }
            onCancel={() => setShowNew(false)}
            isPending={isPending}
          />
        </div>
      )}

      {isLoading && <p className={styles.loading}>Loading addresses...</p>}

      {!isLoading && addresses?.length === 0 && !showNew && (
        <p className={styles.empty}>No saved addresses yet.</p>
      )}

      <div className={styles.grid}>
        {addresses?.map((addr) => (
          <AddressCard key={addr.id} address={addr} />
        ))}
      </div>
    </div>
  );
}
