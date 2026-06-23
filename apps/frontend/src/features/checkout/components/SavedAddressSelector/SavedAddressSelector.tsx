"use client";

import Link from "next/link";
import { useAddresses } from "@/features/addresses";
import type { Address } from "@/features/addresses";
import styles from "./SavedAddressSelector.module.scss";

interface SavedAddressSelectorProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function formatAddress(a: Address): string {
  const parts = [a.line1];
  if (a.line2) parts.push(a.line2);
  parts.push(`${a.city}, ${a.state} ${a.postalCode}`);
  parts.push(a.country);
  return parts.join(", ");
}

export function SavedAddressSelector({
  selectedId,
  onSelect,
}: SavedAddressSelectorProps) {
  const { data: addresses, isLoading } = useAddresses();

  if (isLoading) {
    return <div className={styles.loading}>Loading addresses…</div>;
  }

  if (!addresses?.length) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>No saved addresses.</p>
        <Link href="/account/addresses" className={styles.addLink}>
          Add a shipping address
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {addresses.map((addr) => (
        <label
          key={addr.id}
          className={`${styles.option} ${selectedId === addr.id ? styles.selected : ""}`}
        >
          <input
            type="radio"
            name="shipping-address"
            className={styles.radio}
            value={addr.id}
            checked={selectedId === addr.id}
            onChange={() => onSelect(addr.id)}
          />
          <div className={styles.addrBody}>
            <span className={styles.name}>
              {addr.firstName} {addr.lastName}
              {addr.isDefault && (
                <span className={styles.defaultBadge}>Default</span>
              )}
            </span>
            <span className={styles.addrText}>{formatAddress(addr)}</span>
          </div>
        </label>
      ))}
    </div>
  );
}
