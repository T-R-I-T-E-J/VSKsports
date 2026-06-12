import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Bridge for the prototype's <image-slot> placeholders.
 * With `src` it renders an optimized next/image; without one it renders a
 * labelled placeholder box (the `placeholder` text describes the intended photo).
 */
export function MediaImage({
  src,
  alt,
  placeholder,
  fill,
  width,
  height,
  ratio,
  className,
}: {
  src?: string;
  alt: string;
  placeholder?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  /** CSS aspect-ratio, e.g. "4/3" — used by the placeholder box. */
  ratio?: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt || placeholder}
        style={ratio ? { aspectRatio: ratio } : undefined}
        className={cn(
          "grid place-items-center bg-paper-3 p-4 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-mute",
          className,
        )}
      >
        {placeholder || alt || "image"}
      </div>
    );
  }
  if (fill) {
    return (
      <Image src={src} alt={alt} fill className={cn("object-cover", className)} />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 800}
      height={height ?? 600}
      className={className}
    />
  );
}
