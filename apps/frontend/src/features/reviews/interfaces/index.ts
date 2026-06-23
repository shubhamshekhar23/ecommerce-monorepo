export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

export interface CreateReviewPayload {
  productId: string;
  rating: number;
  title?: string;
  body?: string;
}
