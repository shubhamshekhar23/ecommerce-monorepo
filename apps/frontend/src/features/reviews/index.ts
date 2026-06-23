// Public API — import from here, not from internal paths
export { ReviewList } from "./components/ReviewList/ReviewList";
export { ReviewForm } from "./components/ReviewForm/ReviewForm";

export {
  useProductReviews,
  useCreateReview,
  useUpdateReview,
  useDeleteReview,
} from "./hooks/useReviews";

export type { Review, CreateReviewPayload } from "./interfaces";
