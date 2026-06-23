// Public API — import from here, not from internal paths
export { AddressCard } from "./components/AddressCard/AddressCard";
export { AddressForm } from "./components/AddressForm/AddressForm";

export {
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
} from "./hooks/useAddresses";

export type {
  Address,
  CreateAddressPayload,
  UpdateAddressPayload,
} from "./interfaces";
