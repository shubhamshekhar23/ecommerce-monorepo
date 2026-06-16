export type SortDir = 'asc' | 'desc';

/*
 - Generic sort param parser: splits "field:dir,field:dir" into typed orderBy entries.
 - Unknown fields are dropped via the mapper returning null (allowlist enforced in the DTO).
 */
export function parseSortParam<T>(
  sort: string | undefined,
  mapper: (field: string, dir: SortDir) => T | null,
): T[] {
  if (!sort) return [];
  return sort.split(',').flatMap((part) => {
    const [field, rawDir = 'asc'] = part.trim().split(':');
    const dir: SortDir = rawDir === 'desc' ? 'desc' : 'asc';
    const mapped = mapper(field, dir);
    return mapped !== null ? [mapped] : [];
  });
}
