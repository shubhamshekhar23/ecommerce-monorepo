"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/Form";
import { nameSchema, postalCodeSchema } from "@/shared/validators";
import type { Address, CreateAddressPayload } from "../../interfaces";
import styles from "./AddressForm.module.scss";

const addressSchema = z.object({
  firstName: nameSchema("First name"),
  lastName: nameSchema("Last name"),
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: postalCodeSchema,
  country: z.string().min(2, "Country is required"),
});

type AddressFormValues = z.infer<typeof addressSchema>;

interface AddressFormProps {
  initial?: Address;
  onSubmit: (values: CreateAddressPayload) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function AddressForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
}: AddressFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: initial ?? {},
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.row}>
        <Input
          {...register("firstName")}
          id="addr-firstName"
          label="First name"
          error={errors.firstName?.message}
        />
        <Input
          {...register("lastName")}
          id="addr-lastName"
          label="Last name"
          error={errors.lastName?.message}
        />
      </div>

      <Input
        {...register("line1")}
        id="addr-line1"
        label="Address line 1"
        autoComplete="address-line1"
        error={errors.line1?.message}
      />
      <Input
        {...register("line2")}
        id="addr-line2"
        label="Address line 2 (optional)"
        autoComplete="address-line2"
        error={errors.line2?.message}
      />

      <div className={styles.row}>
        <Input
          {...register("city")}
          id="addr-city"
          label="City"
          autoComplete="address-level2"
          error={errors.city?.message}
        />
        <Input
          {...register("state")}
          id="addr-state"
          label="State / Province"
          autoComplete="address-level1"
          error={errors.state?.message}
        />
      </div>

      <div className={styles.row}>
        <Input
          {...register("postalCode")}
          id="addr-postal"
          label="Postal code"
          autoComplete="postal-code"
          error={errors.postalCode?.message}
        />
        <Input
          {...register("country")}
          id="addr-country"
          label="Country"
          autoComplete="country"
          error={errors.country?.message}
        />
      </div>

      <div className={styles.actions}>
        <button type="submit" disabled={isPending} className={styles.submit}>
          {isPending
            ? "Saving..."
            : initial
              ? "Update address"
              : "Save address"}
        </button>
        <button type="button" onClick={onCancel} className={styles.cancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
