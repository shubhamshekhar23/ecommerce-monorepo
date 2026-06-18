import { ImageResponse } from "@vercel/og";

export const runtime = "edge";
export const alt = "Product preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface ProductData {
  name: string;
  price: number;
  category?: { name: string };
  images?: Array<{ url: string; isMain?: boolean }>;
}

async function fetchProduct(slug: string): Promise<ProductData | null> {
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

export default async function ProductOGImage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  const name = product?.name ?? "ShopHub Product";
  const price =
    product?.price != null ? `$${Number(product.price).toFixed(2)}` : "";
  const category = product?.category?.name ?? "";
  const imageUrl =
    product?.images?.find((img) => img.isMain)?.url ??
    product?.images?.[0]?.url ??
    null;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "1200px",
        height: "630px",
        background: "#f4f6fb",
        fontFamily: "sans-serif",
      }}
    >
      {/* Left: product image */}
      <div
        style={{
          display: "flex",
          width: "560px",
          height: "630px",
          background: "#e8ecef",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {imageUrl ? (
           
          <img
            src={imageUrl}
            alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              fontSize: "80px",
              color: "#cbd5e1",
            }}
          >
            🛍
          </div>
        )}
      </div>

      {/* Right: text content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 56px",
          flex: 1,
        }}
      >
        {/* Top: logo + category */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              fontSize: "28px",
              fontWeight: 700,
              color: "#2563eb",
            }}
          >
            ShopHub
          </div>
          {category && (
            <div
              style={{
                display: "flex",
                fontSize: "18px",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {category}
            </div>
          )}
        </div>

        {/* Middle: product name */}
        <div
          style={{
            display: "flex",
            fontSize: name.length > 40 ? "36px" : "44px",
            fontWeight: 800,
            color: "#0f172a",
            lineHeight: 1.15,
          }}
        >
          {name}
        </div>

        {/* Bottom: price + CTA */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {price && (
            <div
              style={{
                display: "flex",
                fontSize: "48px",
                fontWeight: 800,
                color: "#2563eb",
              }}
            >
              {price}
            </div>
          )}
          <div
            style={{
              display: "flex",
              fontSize: "20px",
              color: "#475569",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>{APP_URL.replace(/^https?:\/\//, "")}</span>
          </div>
        </div>
      </div>
    </div>,
    { ...size },
  );
}
