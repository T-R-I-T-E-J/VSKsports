"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ADMIN_NAV } from "@/lib/nav";
import {
  ICON_MAP,
  IconSearch,
  IconBell,
  IconExternal,
  IconMenu,
} from "@/components/icons";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen bg-paper-2">
      {/* sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-ink text-white/70 transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue font-display text-[14px] font-extrabold text-white">
            <span>
              <span className="text-red-2">V</span>SK
            </span>
          </span>
          <span className="leading-tight">
            <b className="block font-display text-[15px] font-extrabold uppercase tracking-tight text-white">
              VSK Admin
            </b>
            <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
              Control Panel
            </span>
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {ADMIN_NAV.map((sec) => (
            <div key={sec.group} className="mb-4">
              <div className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                {sec.group}
              </div>
              {sec.items.map((it) => {
                const Ic = ICON_MAP[it.icon];
                const active = isActive(it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] transition-colors",
                      active
                        ? "bg-blue text-white"
                        : "hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Ic width={18} height={18} />
                    <span className="flex-1">{it.label}</span>
                    {it.badge && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-mono text-[10px]",
                          it.badgeMute
                            ? "bg-white/10 text-white/60"
                            : "bg-red text-white",
                        )}
                      >
                        {it.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 text-[13px] hover:text-white"
          >
            <IconExternal width={16} height={16} />
            View Storefront
          </Link>
        </div>
      </aside>

      {/* mobile backdrop */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-ink/50 lg:hidden",
          open ? "block" : "hidden",
        )}
      />

      {/* main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-line bg-paper px-5 py-3">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="grid h-9 w-9 place-items-center rounded-md hover:bg-paper-2 lg:hidden"
          >
            <IconMenu width={20} height={20} />
          </button>
          <div className="flex max-w-md flex-1 items-center gap-2 rounded-md border border-line bg-paper-2 px-3 py-2 text-mute">
            <IconSearch width={16} height={16} />
            <input
              placeholder="Search orders, products, customers…"
              className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-mute"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              aria-label="View store"
              className="grid h-9 w-9 place-items-center rounded-md hover:bg-paper-2"
            >
              <IconExternal width={18} height={18} />
            </Link>
            <button
              aria-label="Notifications"
              className="relative grid h-9 w-9 place-items-center rounded-md hover:bg-paper-2"
            >
              <IconBell width={18} height={18} />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-red" />
            </button>
            <div className="flex items-center gap-2 pl-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-blue font-mono text-[12px] font-semibold text-white">
                VK
              </span>
              <span className="hidden leading-tight sm:block">
                <b className="block text-[13px]">V. Kumar</b>
                <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-mute">
                  Administrator
                </span>
              </span>
            </div>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
