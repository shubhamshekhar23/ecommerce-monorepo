// Public API — import from here, not from internal paths
export { ReviewList } from "./components/ReviewList/ReviewList";
export { ReviewForm } from "./components/ReviewForm/ReviewForm";

export {
  useProductReviews,
  useCreateReview,
  useApproveReview,
  useRejectReview,
} from "./hooks/useReviews";

export {
  getProductReviewsApi,
  createReviewApi,
  approveReviewApi,
  rejectReviewApi,
} from "./api/reviews.api";

export type { Review, CreateReviewPayload } from "./interfaces";
