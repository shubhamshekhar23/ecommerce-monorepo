export type ReturnReason =
  | "DEFECTIVE"
  | "WRONG_ITEM"
  | "NOT_AS_DESCRIBED"
  | "CHANGED_MIND"
  | "OTHER";

export type ReturnStatus = "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED";

export interface ReturnRequest {
  id: string;
  orderId: string;
  reason: ReturnReason;
  description?: string;
  status: ReturnStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReturnPayload {
  orderId: string;
  reason: ReturnReason;
  description?: string;
}
