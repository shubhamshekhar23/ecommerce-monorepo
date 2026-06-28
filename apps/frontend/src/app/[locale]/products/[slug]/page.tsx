import { ProductDetailPage } from "@/features/products";
import { fetchProductDetail } from "@/features/products";

export const revalidate = 3600;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/products?limit=1000`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data as Array<{ slug: string }>).map((p) => ({
      slug: p.slug,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await fetchProductDetail(slug);

  if (!product) {
    return {
      title: "Product | ShopHub",
      description: "View product details at ShopHub.",
    };
  }

  const description = (
    product.description ?? `Buy ${product.name} at ShopHub.`
  ).slice(0, 155);
  const image = product.images?.[0]?.url;
  const canonical = `${APP_URL}/products/${slug}`;

  return {
    title: `${product.name} | ShopHub`,
    description,
    alternates: { canonical },
    openGraph: {
      title: product.name,
      description,
      url: canonical,
      type: "website",
      ...(image && { images: [{ url: image, alt: product.name }] }),
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <ProductDetailPage slug={slug} />;
}
