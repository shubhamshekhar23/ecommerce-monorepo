/**
 * Generates a URL-friendly slug from a string
 * Converts to lowercase, removes special characters, replaces spaces with hyphens
 * @param text The text to slugify
 * @returns The generated slug
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Validates slug format (lowercase alphanumeric with hyphens only)
 * @param slug The slug to validate
 * @returns true if valid format, false otherwise
 */
export function validateSlugFormat(slug: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug);
}
