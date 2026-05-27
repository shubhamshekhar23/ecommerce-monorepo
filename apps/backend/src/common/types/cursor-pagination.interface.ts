export interface CursorMeta {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface CursorPageDto<T> {
  data: T[];
  meta: CursorMeta;
}

// Internal cursor payload — encoded as base64 JSON in API responses.
// Using createdAt + id gives stable ordering even when two rows share the same timestamp.
export interface CursorPayload {
  id: string;
  createdAt: string; // ISO-8601
}
