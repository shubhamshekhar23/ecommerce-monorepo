import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Generate a sitemap entry for every locale variant of a path.
function localeEntries(
  path: string,
  opts: Omit<MetadataRoute.Sitemap[number], "url">,
): MetadataRoute.Sitemap {
  return routing.locales.map((locale) => ({
    url: `${APP_URL}/${locale}${path}`,
    ...opts,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    ...localeEntries("", {
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    }),
    ...localeEntries("/products", {
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    }),
    ...localeEntries("/privacy", {
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    }),
  ];

  try {
    const res = await fetch(`${API_URL}/products?limit=1000`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const productRoutes: MetadataRoute.Sitemap = (
        data.data as Array<{ slug: string; updatedAt: string }>
      ).flatMap((p) =>
        localeEntries(`/products/${p.slug}`, {
          lastModified: new Date(p.updatedAt),
          changeFrequency: "weekly",
          priority: 0.8,
        }),
      );
      return [...staticRoutes, ...productRoutes];
    }
  } catch {
    /* fall back to static routes */
  }

  return staticRoutes;
}
