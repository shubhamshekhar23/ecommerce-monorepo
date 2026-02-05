import { PaginationDto, PaginationMeta } from '@/common/types/pagination.interface';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function calculatePagination(
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
): {
  skip: number;
  take: number;
} {
  const validPage = Math.max(page, 1);
  const validLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);

  return {
    skip: (validPage - 1) * validLimit,
    take: validLimit,
  };
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const pages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    pages,
    hasMore: page < pages,
  };
}

export function buildPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginationDto<T> {
  return {
    data,
    meta: buildPaginationMeta(total, page, limit),
  };
}
