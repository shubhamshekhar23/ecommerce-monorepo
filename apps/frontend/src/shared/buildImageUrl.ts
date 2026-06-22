/**
 * Transforms an image URL through the configured CDN when NEXT_PUBLIC_IMAGE_CDN_URL
 * is set. Falls back to the original URL when no CDN is configured so all image
 * components work without any CDN setup.
 *
 * Supports Cloudinary fetch-URL pattern:
 *   https://res.cloudinary.com/<cloud>/image/fetch/w_<width>,q_<quality>/<original-url>
 *
 * For Imgix or Bunny.net, swap the URL construction in this one function —
 * all image components call buildImageUrl() so it's a one-line change.
 *
 * Add to next.config.ts remotePatterns when a CDN is configured:
 *   { protocol: "https", hostname: "res.cloudinary.com" }
 */

const CDN_BASE = process.env.NEXT_PUBLIC_IMAGE_CDN_URL ?? "";

interface ImageTransformOptions {
  width?: number;
  quality?: number;
}

export function buildImageUrl(
  src: string,
  { width, quality = 80 }: ImageTransformOptions = {},
): string {
  if (!CDN_BASE || !src.startsWith("http")) return src;

  const transforms = [width ? `w_${width}` : null, `q_${quality}`]
    .filter(Boolean)
    .join(",");

  return `${CDN_BASE}/${transforms}/${encodeURIComponent(src)}`;
}
