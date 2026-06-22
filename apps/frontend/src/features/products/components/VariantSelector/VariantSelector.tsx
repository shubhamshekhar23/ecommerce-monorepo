"use client";

import { useState, useEffect, useMemo } from "react";
import type { ProductVariant, DerivedVariantType } from "../../interfaces";
import styles from "./VariantSelector.module.scss";

interface VariantSelectorProps {
  variants: ProductVariant[];
  onVariantChange: (
    variant: ProductVariant | null,
    isFullySelected: boolean,
  ) => void;
}

// Derives the selectable type/option matrix from the flat variants array.
// We don't need a separate variantTypes endpoint — the data is embedded in
// each variant's attributeValues.
function deriveVariantTypes(variants: ProductVariant[]): DerivedVariantType[] {
  const map = new Map<string, Set<string>>();

  for (const variant of variants) {
    for (const av of variant.attributeValues) {
      const typeName = av.option.variantType.name;
      if (!map.has(typeName)) map.set(typeName, new Set());
      map.get(typeName)!.add(av.option.value);
    }
  }

  return Array.from(map.entries()).map(([name, options]) => ({
    name,
    options: Array.from(options),
  }));
}

function findMatchingVariant(
  variants: ProductVariant[],
  selection: Record<string, string>,
): ProductVariant | null {
  return (
    variants.find((v) =>
      v.attributeValues.every(
        (av) => selection[av.option.variantType.name] === av.option.value,
      ),
    ) ?? null
  );
}

export function VariantSelector({
  variants,
  onVariantChange,
}: VariantSelectorProps) {
  const [selection, setSelection] = useState<Record<string, string>>({});

  const variantTypes = useMemo(() => deriveVariantTypes(variants), [variants]);

  const isFullySelected =
    variantTypes.length > 0 && variantTypes.every((t) => !!selection[t.name]);
  const matchedVariant = isFullySelected
    ? findMatchingVariant(variants, selection)
    : null;

  useEffect(() => {
    onVariantChange(matchedVariant, isFullySelected);
  }, [matchedVariant, isFullySelected, onVariantChange]);

  if (variantTypes.length === 0) return null;

  const handleSelect = (typeName: string, value: string) => {
    setSelection((prev) => ({ ...prev, [typeName]: value }));
  };

  const isOptionOutOfStock = (typeName: string, value: string): boolean => {
    const hypothetical = { ...selection, [typeName]: value };
    const allTypesSelected = variantTypes.every((t) => !!hypothetical[t.name]);
    if (!allTypesSelected) return false;
    const match = findMatchingVariant(variants, hypothetical);
    return match !== null && match.stock === 0;
  };

  return (
    <div className={styles.root}>
      {variantTypes.map((type) => (
        <div key={type.name} className={styles.typeGroup}>
          <p className={styles.typeLabel}>{type.name}</p>
          <div className={styles.options}>
            {type.options.map((value) => {
              const isSelected = selection[type.name] === value;
              const outOfStock = isOptionOutOfStock(type.name, value);

              return (
                <button
                  key={value}
                  type="button"
                  className={`${styles.option} ${isSelected ? styles.optionSelected : ""} ${outOfStock ? styles.optionOos : ""}`}
                  onClick={() => handleSelect(type.name, value)}
                  aria-pressed={isSelected}
                  title={outOfStock ? `${value} — Out of stock` : value}
                >
                  {value}
                  {outOfStock && (
                    <span className={styles.oosLine} aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {isFullySelected && !matchedVariant && (
        <p className={styles.unavailable}>This combination is unavailable</p>
      )}
    </div>
  );
}
