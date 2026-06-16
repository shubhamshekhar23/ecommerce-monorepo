export interface ReviewApprovedEvent {
  messageId: string;
  reviewId: string;
  productId: string;
  userId: string;
  userEmail: string;
  userFirstName: string;
}

export interface ReviewRejectedEvent {
  messageId: string;
  reviewId: string;
  productId: string;
  userId: string;
  userEmail: string;
  userFirstName: string;
}
