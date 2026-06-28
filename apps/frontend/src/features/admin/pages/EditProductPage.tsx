"use client";

import { useState } from "react";
import { useAdminProduct } from "@/features/admin/hooks";
import {
  ProductForm,
  VariantTypesManager,
  VariantsTable,
} from "@/features/admin";
import { Breadcrumb } from "@/components/Breadcrumb/Breadcrumb";
import styles from "./EditProductPage.module.scss";

type Tab = "details" | "variants";

interface Props {
  productId: string;
}

export function EditProductPage({ productId }: Props) {
  const { data: product, isLoading, error } = useAdminProduct(productId);
  const [tab, setTab] = useState<Tab>("details");

  if (isLoading) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        Loading product...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#cb2431" }}>
        {error ? `Error: ${error.message}` : "Product not found"}
      </div>
    );
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Products", href: "/admin/products" },
          { label: `Edit: ${product.name}` },
        ]}
      />

      <div className={styles.tabs}>
        <button
          className={tab === "details" ? styles.tabActive : styles.tab}
          onClick={() => setTab("details")}
        >
          Details
        </button>
        <button
          className={tab === "variants" ? styles.tabActive : styles.tab}
          onClick={() => setTab("variants")}
        >
          Variants{" "}
          {product.variants?.length ? `(${product.variants.length})` : ""}
        </button>
      </div>

      {tab === "details" && <ProductForm product={product} />}

      {tab === "variants" && (
        <div className={styles.variantsPanel}>
          <VariantTypesManager
            productId={product.id}
            variantTypes={
              (
                product as typeof product & {
                  variantTypes?: {
                    id: string;
                    name: string;
                    options?: { id: string; value: string }[];
                  }[];
                }
              ).variantTypes ?? []
            }
          />
          <VariantsTable
            productId={product.id}
            variants={product.variants ?? []}
          />
        </div>
      )}
    </>
  );
}
