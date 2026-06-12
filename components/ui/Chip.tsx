import { cn } from "@/lib/cn";

const VARIANT = {
  default: "",
  new: "chip--new",
  sale: "chip--sale",
  vsk: "chip--vsk",
  live: "chip--live",
} as const;

/** Mono badge/chip. `live` variant renders the pulsing dot automatically. */
export function Chip({
  variant = "default",
  className,
  children,
}: {
  variant?: keyof typeof VARIANT;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("chip", VARIANT[variant], className)}>
      {variant === "live" && <span className="dot" />}
      {children}
    </span>
  );
}
