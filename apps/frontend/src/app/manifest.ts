import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShopHub",
    short_name: "ShopHub",
    description: "A modern e-commerce storefront",
    start_url: "/",
    display: "standalone",
    background_color: "#2d5a2e",
    theme_color: "#2d5a2e",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["shopping"],
    lang: "en",
  };
}
