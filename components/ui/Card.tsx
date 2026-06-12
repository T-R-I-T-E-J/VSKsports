import { cn } from "@/lib/cn";

/** Base surface card — white, hairline border, large radius. */
export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border border-line bg-paper", className)}>
      {children}
    </div>
  );
}
