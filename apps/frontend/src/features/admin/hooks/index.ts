// src/features/admin/hooks/index.ts

export { useAdminProducts } from "./useAdminProducts";
export { useAdminProduct } from "./useAdminProduct";
export { useCreateProduct } from "./useCreateProduct";
export { useUpdateProduct } from "./useUpdateProduct";
export { useDeleteProduct } from "./useDeleteProduct";
export { useAddProductImages } from "./useAddProductImages";
export { useDeleteProductImage } from "./useDeleteProductImage";
export { useAdminCategories } from "./useAdminCategories";
export { useAdminCategory } from "./useAdminCategory";
export { useCreateCategory } from "./useCreateCategory";
export { useUpdateCategory } from "./useUpdateCategory";
export { useDeleteCategory } from "./useDeleteCategory";
export { useAdminOrders } from "./useAdminOrders";
export { useUpdateOrderStatus } from "./useUpdateOrderStatus";
export { useAdminUsers } from "./useAdminUsers";
export {
  useCreateVariantType,
  useAddVariantOption,
  useDeleteVariant,
  useUpdateVariantStock,
} from "./useVariants";
export {
  useArchivedProducts,
  useRestoreProduct,
  usePurgeProduct,
} from "./useArchivedProducts";
export { useCsvImport } from "./useCsvImport";
export {
  usePromotionRules,
  useCreatePromotionRule,
  useUpdatePromotionRule,
  useDeletePromotionRule,
} from "./usePromotionRules";
export {
  useAdminReturns,
  useApproveReturn,
  useRejectReturn,
  useRefundReturn,
} from "./useAdminReturns";
export { useAdminOrderFeed } from "./useAdminOrderFeed";
