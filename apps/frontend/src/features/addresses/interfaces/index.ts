export interface Address {
  id: string;
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateAddressPayload = Omit<
  Address,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateAddressPayload = Partial<CreateAddressPayload>;
