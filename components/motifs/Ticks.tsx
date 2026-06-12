import { cn } from "@/lib/cn";

/** Reticle corner-ticks wrapper (precision motif). */
export function Ticks({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("ticks", className)}>{children}</div>;
}
