"use client";

import { useState } from "react";
import { useProductReviews, useCreateReview } from "../../hooks/useReviews";
import { ReviewForm } from "../ReviewForm/ReviewForm";
import { useAuthStore } from "@/store/auth.store";
import styles from "./ReviewList.module.scss";

interface ReviewListProps {
  productId: string;
}

export function ReviewList({ productId }: ReviewListProps) {
  const user = useAuthStore((s) => s.user);
  const [showForm, setShowForm] = useState(false);
  const { data: reviews, isLoading } = useProductReviews(productId);
  const { mutate: createReview, isPending } = useCreateReview(productId);

  const hasReviewed = reviews?.some((r) => r.userId === user?.id);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Reviews</h2>
        {user && !hasReviewed && !showForm && (
          <button onClick={() => setShowForm(true)} className={styles.writeBtn}>
            Write a review
          </button>
        )}
      </div>

      {showForm && (
        <div className={styles.formWrapper}>
          <ReviewForm
            onSubmit={(v) =>
              createReview(v, { onSuccess: () => setShowForm(false) })
            }
            onCancel={() => setShowForm(false)}
            isPending={isPending}
          />
        </div>
      )}

      {isLoading && <p className={styles.muted}>Loading reviews...</p>}
      {!isLoading && reviews?.length === 0 && (
        <p className={styles.muted}>No reviews yet. Be the first!</p>
      )}

      <ul className={styles.list}>
        {reviews?.map((review) => (
          <li key={review.id} className={styles.item}>
            <div className={styles.meta}>
              <span className={styles.author}>
                {review.user.firstName} {review.user.lastName.charAt(0)}.
              </span>
              <span className={styles.stars}>
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)}
              </span>
              <time className={styles.date}>
                {new Date(review.createdAt).toLocaleDateString()}
              </time>
            </div>
            <p className={styles.comment}>{review.comment}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
