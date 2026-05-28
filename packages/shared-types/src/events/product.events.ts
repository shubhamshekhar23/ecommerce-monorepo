export interface ProductCreatedEvent {
  productId: string;
  name: string;
  description: string | null;
  price: number;
  categoryId: string | null;
  slug: string;
  correlationId?: string;
}

export interface ProductUpdatedEvent {
  productId: string;
  name?: string;
  description?: string | null;
  price?: number;
  categoryId?: string | null;
  slug?: string;
  correlationId?: string;
}

export interface ProductDeletedEvent {
  productId: string;
  correlationId?: string;
}
