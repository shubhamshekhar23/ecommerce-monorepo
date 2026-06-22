"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCategories } from "@/features/products/hooks";
import { useCreateProduct, useUpdateProduct } from "../../hooks";
import type { Product } from "@/features/products/interfaces";
import type { ProductImageDto } from "../../api/admin-products.api";
import { Input, Select, Textarea } from "@/components/Form";
import styles from "./ProductForm.module.scss";

interface ProductFormProps {
  product?: Product;
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const { data: categoriesData } = useCategories();
  const { mutate: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct();

  const isEditMode = !!product;
  const isPending = isCreating || isUpdating;

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    cost: "",
    stock: "",
    categoryId: "",
  });

  const [images, setImages] = useState<ProductImageDto[]>([]);

  useEffect(() => {
    if (product) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        name: product.name,
        slug: product.slug,
        description: product.description || "",
        price: product.price.toString(),
        cost: product.cost.toString(),
        stock: product.stock.toString(),
        categoryId: product.categoryId,
      });
      setImages(product.images || []);
    }
  }, [product]);

  const handleNameChange = (value: string): void => {
    const slug = value
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    setFormData((prev) => ({ ...prev, name: value, slug }));
  };

  const handleImageChange = (
    index: number,
    field: keyof ProductImageDto,
    value: unknown,
  ): void => {
    const newImages = [...images];
    if (field === "isMain" && value === true) {
      newImages.forEach((img) => {
        img.isMain = false;
      });
    }
    newImages[index] = { ...newImages[index], [field]: value };
    setImages(newImages);
  };

  const handleAddImage = (): void => {
    setImages([
      ...images,
      {
        url: "",
        altText: "",
        isMain: images.length === 0,
        order: images.length,
      },
    ]);
  };

  const handleRemoveImage = (index: number): void => {
    const newImages = images.filter((_, i) => i !== index);
    newImages.forEach((img, i) => {
      img.order = i;
    });
    if (!newImages.some((img) => img.isMain) && newImages.length > 0) {
      newImages[0].isMain = true;
    }
    setImages(newImages);
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description || undefined,
      price: Number(formData.price),
      cost: Number(formData.cost),
      stock: Number(formData.stock) || 0,
      categoryId: formData.categoryId,
      images: images.length > 0 ? images : undefined,
    };

    if (isEditMode && product) {
      updateProduct(
        { id: product.id, dto: payload },
        { onSuccess: () => router.push("/admin/products") },
      );
    } else {
      createProduct(payload, {
        onSuccess: () => router.push("/admin/products"),
      });
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        {isEditMode ? "Edit Product" : "Create Product"}
      </h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          id="name"
          label="Name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => handleNameChange(e.target.value)}
        />

        <Input
          id="slug"
          label="Slug"
          type="text"
          required
          value={formData.slug}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, slug: e.target.value }))
          }
        />

        <Textarea
          id="description"
          label="Description"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          rows={4}
        />

        <div className={styles.row}>
          <Input
            id="price"
            label="Price"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={formData.price}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, price: e.target.value }))
            }
          />
          <Input
            id="cost"
            label="Cost"
            type="number"
            step="0.01"
            min="0"
            required
            value={formData.cost}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, cost: e.target.value }))
            }
          />
          <Input
            id="stock"
            label="Stock"
            type="number"
            min="0"
            value={formData.stock}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, stock: e.target.value }))
            }
          />
        </div>

        <Select
          id="category"
          label="Category"
          required
          value={formData.categoryId}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, categoryId: e.target.value }))
          }
        >
          <option value="">Select a category</option>
          {categoriesData?.data.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </Select>

        {/* Images Section — custom layout retained */}
        <div className={styles.imagesSection}>
          <p className={styles.imagesLabel}>Images</p>
          {images.map((image, index) => (
            <div key={index} className={styles.imageRow}>
              <div className={styles.imageRowFields}>
                <input
                  type="text"
                  placeholder="Image URL"
                  value={image.url}
                  onChange={(e) =>
                    handleImageChange(index, "url", e.target.value)
                  }
                  className={styles.input}
                  aria-label={`Image ${index + 1} URL`}
                />
                <input
                  type="text"
                  placeholder="Alt text (optional)"
                  value={image.altText || ""}
                  onChange={(e) =>
                    handleImageChange(index, "altText", e.target.value)
                  }
                  className={styles.input}
                  aria-label={`Image ${index + 1} alt text`}
                />
                <input
                  type="number"
                  placeholder="Order"
                  min="0"
                  value={image.order ?? ""}
                  onChange={(e) =>
                    handleImageChange(
                      index,
                      "order",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  className={styles.input}
                  style={{ maxWidth: "80px" }}
                  aria-label={`Image ${index + 1} order`}
                />
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={image.isMain || false}
                    onChange={(e) =>
                      handleImageChange(index, "isMain", e.target.checked)
                    }
                  />
                  Main
                </label>
              </div>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => handleRemoveImage(index)}
                disabled={isPending}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className={styles.addImageBtn}
            onClick={handleAddImage}
            disabled={isPending}
          >
            + Add Image
          </button>
        </div>

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isPending}
          >
            {isPending
              ? isEditMode
                ? "Saving..."
                : "Creating..."
              : isEditMode
                ? "Save Changes"
                : "Create Product"}
          </button>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
