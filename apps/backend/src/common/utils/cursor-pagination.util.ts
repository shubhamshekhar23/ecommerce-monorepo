import { CursorPageDto, CursorPayload } from '@/common/types/cursor-pagination.interface';

export const DEFAULT_CURSOR_LIMIT = 20;
export const MAX_CURSOR_LIMIT = 100;

export function encodeCursor(id: string, createdAt: Date): string {
  const payload: CursorPayload = { id, createdAt: createdAt.toISOString() };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function decodeCursor(cursor: string): CursorPayload {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as CursorPayload;
  } catch {
    throw new Error('Invalid cursor');
  }
}

// Builds the Prisma WHERE clause for keyset pagination.
// Fetches rows where (createdAt < cursor.createdAt) OR (createdAt = cursor.createdAt AND id < cursor.id).
// This is O(log n) via the index regardless of page depth — unlike OFFSET which is O(n).
export function buildCursorWhere(cursor: string | undefined): Record<string, unknown> {
  if (!cursor) return {};
  const { id, createdAt } = decodeCursor(cursor);
  return {
    OR: [
      { createdAt: { lt: new Date(createdAt) } },
      { createdAt: new Date(createdAt), id: { lt: id } },
    ],
  };
}

export function buildCursorResponse<T extends { id: string; createdAt: Date }>(
  items: T[],
  limit: number,
  hasMore: boolean,
): CursorPageDto<T> {
  const nextCursor =
    hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1].id, items[items.length - 1].createdAt)
      : null;

  return { data: items, meta: { limit, hasMore, nextCursor } };
}
