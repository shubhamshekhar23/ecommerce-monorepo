import { ProductDetailView } from "@/features/products";
import { fetchProductDetail } from "../api/fetchProductDetail";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface Props {
  slug: string;
}

export async function ProductDetailPage({ slug }: Props) {
  const product = await fetchProductDetail(slug);

  // Product schema enables rich results (price, availability) in Google Search.
  const jsonLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description ?? undefined,
        image: product.images?.[0]?.url,
        offers: {
          "@type": "Offer",
          price: String(product.price),
          priceCurrency: "USD",
          availability:
            product.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
        },
      }
    : null;

  const breadcrumbLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${APP_URL}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Products",
            item: `${APP_URL}/products`,
          },
          ...(product.category
            ? [
                {
                  "@type": "ListItem",
                  position: 3,
                  name: product.category.name,
                  item: `${APP_URL}/products?category=${product.category.slug}`,
                },
                { "@type": "ListItem", position: 4, name: product.name },
              ]
            : [{ "@type": "ListItem", position: 3, name: product.name }]),
        ],
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {breadcrumbLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
      )}
      <ProductDetailView slug={slug} />
    </>
  );
}
