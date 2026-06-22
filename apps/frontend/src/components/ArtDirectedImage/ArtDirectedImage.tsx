import Image from "next/image";
import type { ImageProps } from "next/image";

interface ArtDirectedSource {
  srcSet: string;
  media: string;
  type?: string;
  width: number;
  height: number;
}

interface ArtDirectedImageProps extends Omit<
  ImageProps,
  "src" | "width" | "height"
> {
  sources: ArtDirectedSource[];
  fallback: {
    src: string;
    width: number;
    height: number;
  };
}

/**
 * Renders a <picture> element with multiple <source> crops for true art
 * direction. Next.js <Image> only resizes — it cannot serve a portrait
 * crop on mobile and a wide crop on desktop. This component wraps the
 * native <picture> + <source media="..."> pattern to enable that.
 *
 * Usage (hero banner with different aspect ratios per viewport):
 *
 *   <ArtDirectedImage
 *     sources={[
 *       { srcSet: "/images/hero-mobile.webp", media: "(max-width: 767px)", width: 640, height: 800 },
 *       { srcSet: "/images/hero-desktop.webp", media: "(min-width: 768px)", width: 1440, height: 600 },
 *     ]}
 *     fallback={{ src: "/images/hero-desktop.webp", width: 1440, height: 600 }}
 *     alt="Hero banner"
 *     priority
 *   />
 */
export function ArtDirectedImage({
  sources,
  fallback,
  alt,
  className,
  style,
  priority,
  ...rest
}: ArtDirectedImageProps) {
  return (
    <picture>
      {sources.map(({ srcSet, media, type, width, height }) => (
        <source
          key={`${media}-${srcSet}`}
          srcSet={srcSet}
          media={media}
          type={type}
          width={width}
          height={height}
        />
      ))}
      <Image
        src={fallback.src}
        width={fallback.width}
        height={fallback.height}
        alt={alt as string}
        className={className}
        style={style}
        priority={priority}
        {...rest}
      />
    </picture>
  );
}
