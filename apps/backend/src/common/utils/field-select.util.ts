const PRODUCT_ALLOWED_FIELDS = new Set([
  'id',
  'name',
  'slug',
  'categoryId',
  'isActive',
  'createdAt',
  'updatedAt',
]);

/*
 - Converts ?fields=id,name,slug to { id: true, name: true, slug: true }.
 - Unknown or disallowed fields are silently dropped; returns undefined when nothing survives.
 - Caller must omit `include` when the return value is non-null (Prisma disallows both together).
 */
export function buildProductSelect(fields: string | undefined): Record<string, true> | undefined {
  if (!fields) return undefined;
  const kept = fields
    .split(',')
    .map((f) => f.trim())
    .filter((f) => PRODUCT_ALLOWED_FIELDS.has(f));
  return kept.length > 0 ? Object.fromEntries(kept.map((f) => [f, true])) : undefined;
}
