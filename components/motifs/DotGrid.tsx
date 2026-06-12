import { cn } from "@/lib/cn";

/** Measurement dot-grid background (decorative). */
export function DotGrid({ className }: { className?: string }) {
  return <div className={cn("dotgrid", className)} aria-hidden="true" />;
}
