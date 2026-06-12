import Link from "next/link";
import { cn } from "@/lib/cn";
import { TargetRings } from "./TargetRings";

type Crumb = { label: string; href?: string };

/** Inner-page header band with target-rings backdrop + breadcrumb (dark or light). */
export function PageHead({
  title,
  sub,
  breadcrumb,
  dark = false,
}: {
  title: string;
  sub?: string;
  breadcrumb?: Crumb[];
  dark?: boolean;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden",
        dark ? "bg-ink text-white" : "bg-paper-2",
      )}
    >
      <TargetRings
        stroke={dark ? "#ffffff" : "#1B43C8"}
        className="pointer-events-none absolute top-1/2 right-[-80px] w-[420px] -translate-y-1/2 opacity-60"
      />
      <div className="wrap relative py-14">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="mb-4 font-mono text-[11px] uppercase tracking-[0.12em]"
          >
            {breadcrumb.map((c, i) => (
              <span key={i}>
                {c.href ? (
                  <Link href={c.href} className="text-blue-2 hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span className={dark ? "text-white/70" : "text-mute"}>
                    {c.label}
                  </span>
                )}
                {i < breadcrumb.length - 1 && (
                  <span className="mx-2 text-mute">/</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="h-sec">{title}</h1>
        {sub && (
          <p className={cn("lead mt-3", dark && "text-white/70")}>{sub}</p>
        )}
      </div>
    </section>
  );
}
