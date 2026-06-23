"use client";

import { useState } from "react";
import {
  useCreateVariantType,
  useAddVariantOption,
} from "../../hooks/useVariants";
import type { VariantType } from "@/features/products/interfaces";
import styles from "./VariantTypesManager.module.scss";

interface VariantTypesManagerProps {
  productId: string;
  variantTypes: (VariantType & { options?: { id: string; value: string }[] })[];
}

export function VariantTypesManager({
  productId,
  variantTypes,
}: VariantTypesManagerProps) {
  const [newTypeName, setNewTypeName] = useState("");
  const [newOptionValues, setNewOptionValues] = useState<
    Record<string, string>
  >({});

  const { mutate: createType, isPending: isCreatingType } =
    useCreateVariantType(productId);
  const { mutate: addOption, isPending: isAddingOption } =
    useAddVariantOption(productId);

  return (
    <div className={styles.manager}>
      <h3 className={styles.heading}>Variant Types</h3>

      {variantTypes.map((type) => (
        <div key={type.id} className={styles.typeBlock}>
          <p className={styles.typeName}>{type.name}</p>
          <div className={styles.options}>
            {type.options?.map((opt) => (
              <span key={opt.id} className={styles.optionChip}>
                {opt.value}
              </span>
            ))}
          </div>
          <div className={styles.addOptionRow}>
            <input
              type="text"
              placeholder="Add option (e.g. Red)"
              value={newOptionValues[type.id] ?? ""}
              onChange={(e) =>
                setNewOptionValues((prev) => ({
                  ...prev,
                  [type.id]: e.target.value,
                }))
              }
              className={styles.input}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const value = newOptionValues[type.id]?.trim();
                  if (value) {
                    addOption(
                      { typeId: type.id, value },
                      {
                        onSuccess: () =>
                          setNewOptionValues((prev) => ({
                            ...prev,
                            [type.id]: "",
                          })),
                      },
                    );
                  }
                }
              }}
            />
            <button
              className={styles.addBtn}
              disabled={isAddingOption || !newOptionValues[type.id]?.trim()}
              onClick={() => {
                const value = newOptionValues[type.id]?.trim();
                if (value) {
                  addOption(
                    { typeId: type.id, value },
                    {
                      onSuccess: () =>
                        setNewOptionValues((prev) => ({
                          ...prev,
                          [type.id]: "",
                        })),
                    },
                  );
                }
              }}
            >
              Add
            </button>
          </div>
        </div>
      ))}

      <div className={styles.newTypeRow}>
        <input
          type="text"
          placeholder="New variant type (e.g. Size)"
          value={newTypeName}
          onChange={(e) => setNewTypeName(e.target.value)}
          className={styles.input}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (newTypeName.trim()) {
                createType(newTypeName.trim(), {
                  onSuccess: () => setNewTypeName(""),
                });
              }
            }
          }}
        />
        <button
          className={styles.primaryBtn}
          disabled={isCreatingType || !newTypeName.trim()}
          onClick={() => {
            if (newTypeName.trim()) {
              createType(newTypeName.trim(), {
                onSuccess: () => setNewTypeName(""),
              });
            }
          }}
        >
          {isCreatingType ? "Adding..." : "+ Add Type"}
        </button>
      </div>
    </div>
  );
}
