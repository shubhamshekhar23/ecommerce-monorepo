const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function fetchProductDetail(slug: string) {
  try {
    const res = await fetch(`${API_URL}/products/slug/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
