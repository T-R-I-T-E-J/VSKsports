import { cn } from "@/lib/cn";

/** Mono uppercase eyebrow with the leading dash. tone: blue (default) | red | light. */
export function Eyebrow({
  tone = "blue",
  className,
  children,
}: {
  tone?: "blue" | "red" | "light";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "eyebrow",
        tone === "red" && "eyebrow--red",
        tone === "light" && "eyebrow--light",
        className,
      )}
    >
      {children}
    </span>
  );
}
