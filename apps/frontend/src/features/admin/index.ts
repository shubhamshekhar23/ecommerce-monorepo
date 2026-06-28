// Public API — import from here, not from internal paths
export { AdminNav } from "./components/AdminNav/AdminNav";
export { AdminProductsView } from "./components/AdminProductsView/AdminProductsView";
export { AdminOrdersView } from "./components/AdminOrdersView/AdminOrdersView";
export { AdminUsersView } from "./components/AdminUsersView/AdminUsersView";
export { AdminCategoriesView } from "./components/AdminCategoriesView/AdminCategoriesView";
export { AdminTableSkeleton } from "./components/AdminTableSkeleton/AdminTableSkeleton";
export { ProductForm } from "./components/ProductForm/ProductForm";
export { CategoryForm } from "./components/CategoryForm/CategoryForm";
export { VariantTypesManager } from "./components/VariantTypesManager/VariantTypesManager";
export { VariantsTable } from "./components/VariantsTable/VariantsTable";
export { CsvImportModal } from "./components/CsvImportModal/CsvImportModal";
export { AdminArchivedView } from "./components/AdminArchivedView/AdminArchivedView";
export { PromotionRuleForm } from "./components/PromotionRuleForm/PromotionRuleForm";
export type { ReturnStatus } from "./api/admin-returns.api";
export type { PromotionRule } from "./api/admin-promotions.api";
export type { FeatureFlag } from "./api/admin-feature-flags.api";
export type { DlqJob, QueueStatsMap } from "./api/admin-queue.api";
export type {
  SlowQuery,
  TableStat,
  ReplicationLag,
  ReplicationStatus,
  PartitionInfo,
} from "./api/admin-db-analytics.api";

export * from "./hooks";

export { EditProductPage } from "./pages/EditProductPage";
export { EditCategoryPage } from "./pages/EditCategoryPage";
export { EditPromotionRulePage } from "./pages/EditPromotionRulePage";
export { NewPromotionRulePage } from "./pages/NewPromotionRulePage";
export { PromotionRulesPage } from "./pages/PromotionRulesPage";
export { FeatureFlagsPage } from "./pages/FeatureFlagsPage";
export { QueuePage } from "./pages/QueuePage";
export { ReturnsPage } from "./pages/ReturnsPage";
export { DbAnalyticsPage } from "./pages/DbAnalyticsPage";
