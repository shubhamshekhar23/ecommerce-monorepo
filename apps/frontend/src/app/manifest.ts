import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShopHub",
    short_name: "ShopHub",
    description: "A modern e-commerce storefront",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6fb",
    theme_color: "#2563eb",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    categories: ["shopping"],
    lang: "en",
  };
}
