// A 1×1 gray (#e5e7eb) SVG — tiny, always the same color, blurred by Next.js at render time.
// Used as blurDataURL on dynamic product images where we don't have a precomputed thumbnail.
function toBase64(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str).toString("base64");
  }
  return btoa(str);
}

const GRAY_PIXEL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="#e5e7eb"/></svg>`;

export const BLUR_PLACEHOLDER = `data:image/svg+xml;base64,${toBase64(GRAY_PIXEL_SVG)}`;
