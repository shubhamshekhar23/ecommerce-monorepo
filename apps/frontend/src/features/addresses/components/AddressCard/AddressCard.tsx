"use client";

import { useState } from "react";
import { useUpdateAddress, useDeleteAddress } from "../../hooks/useAddresses";
import { AddressForm } from "../AddressForm/AddressForm";
import type { Address, CreateAddressPayload } from "../../interfaces";
import styles from "./AddressCard.module.scss";

interface AddressCardProps {
  address: Address;
}

export function AddressCard({ address }: AddressCardProps) {
  const [editing, setEditing] = useState(false);
  const { mutate: update, isPending: isUpdating } = useUpdateAddress();
  const { mutate: remove, isPending: isDeleting } = useDeleteAddress();

  const handleUpdate = (values: CreateAddressPayload) => {
    update(
      { id: address.id, payload: values },
      { onSuccess: () => setEditing(false) },
    );
  };

  if (editing) {
    return (
      <div className={styles.card}>
        <AddressForm
          initial={address}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          isPending={isUpdating}
        />
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <p className={styles.name}>
        {address.firstName} {address.lastName}
      </p>
      <p className={styles.line}>{address.line1}</p>
      {address.line2 && <p className={styles.line}>{address.line2}</p>}
      <p className={styles.line}>
        {address.city}, {address.state} {address.postalCode}
      </p>
      <p className={styles.line}>{address.country}</p>

      <div className={styles.actions}>
        <button onClick={() => setEditing(true)} className={styles.editBtn}>
          Edit
        </button>
        <button
          onClick={() => remove(address.id)}
          disabled={isDeleting}
          className={styles.deleteBtn}
        >
          {isDeleting ? "Removing..." : "Remove"}
        </button>
      </div>
    </div>
  );
}
