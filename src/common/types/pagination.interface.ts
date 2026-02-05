export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasMore: boolean;
}

export interface PaginationDto<T> {
  data: T[];
  meta: PaginationMeta;
}
