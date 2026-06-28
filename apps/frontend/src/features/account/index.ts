// Public API — import from here, not from internal paths
export { ProfileForm } from "./components/ProfileForm/ProfileForm";

export { useUpdateProfile } from "./hooks/useUpdateProfile";
export {
  useRequestDataDeletion,
  useCancelDataDeletion,
} from "./hooks/useDataDeletion";

export {
  getMeApi,
  updateProfileApi,
  requestDataDeletionApi,
  cancelDataDeletionApi,
} from "./api/account.api";

export { SecurityPage } from "./pages/SecurityPage";
export { AddressesPage } from "./pages/AddressesPage";
export { PrivacyPage } from "./pages/PrivacyPage";
