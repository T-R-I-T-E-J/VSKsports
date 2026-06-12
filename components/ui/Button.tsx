import Link from "next/link";
import { cn } from "@/lib/cn";

const VARIANT = {
  primary: "btn--primary",
  red: "btn--red",
  ghost: "btn--ghost",
  light: "btn--light",
  ondark: "btn--ondark",
} as const;

type ButtonProps = {
  variant?: keyof typeof VARIANT;
  size?: "sm" | "md";
  href?: string;
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

/** Brand button. Renders an <a> (next/link) when `href` is set, else a <button>. */
export function Button({
  variant = "primary",
  size = "md",
  href,
  className,
  children,
  ...props
}: ButtonProps) {
  const cls = cn("btn", VARIANT[variant], size === "sm" && "btn--sm", className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
