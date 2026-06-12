import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/cn";

/** VSK Sports brand lockup (logo + name). `dark` puts the logo on a white chip. */
export function Brand({ href = "/", dark = false }: { href?: string; dark?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-3">
      <Image
        src="/vsk-logo.png"
        alt="VSK Sports"
        width={42}
        height={42}
        priority
        className={cn("h-10 w-10 object-contain", dark && "rounded-lg bg-white p-1.5")}
      />
      <span className="leading-tight">
        <b
          className={cn(
            "block font-display text-[18px] font-extrabold uppercase tracking-tight",
            dark ? "text-white" : "text-ink",
          )}
        >
          VSK Sports
        </b>
        <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-mute">
          Shooting · Equipped
        </span>
      </span>
    </Link>
  );
}
