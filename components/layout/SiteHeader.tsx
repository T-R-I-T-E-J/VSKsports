"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Brand } from "./Brand";
import { Button } from "@/components/ui/Button";
import { STOREFRONT_NAV } from "@/lib/nav";
import { logout } from "@/app/actions/account";
import { useI18n } from "@/components/i18n/I18nProvider";
import { LocaleSwitch } from "@/components/i18n/LocaleSwitch";
import {
  IconCheck,
  IconTruck,
  IconPhone,
  IconSearch,
  IconUser,
  IconHeart,
  IconCart,
  IconMenu,
  IconX,
  IconHelp,
} from "@/components/icons";

const iconBtn =
  "grid h-10 w-10 place-items-center rounded-md text-ink transition-colors hover:bg-paper-2";

type HeaderUser = { name?: string | null; email?: string | null; role?: string } | null;

export function SiteHeader({
  cartCount = 0,
  user = null,
}: {
  cartCount?: number;
  user?: HeaderUser;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const isStaff = user?.role === "ADMIN" || user?.role === "STAFF";
  const firstName = user?.name?.trim() ? user.name.trim().split(/\s+/)[0] : "Account";
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* utility bar */}
      <div className="hidden bg-ink text-white/65 md:block">
        <div className="wrap flex items-center justify-between py-2 font-mono text-[11px] uppercase tracking-[0.1em]">
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-2">
              <IconCheck width={13} height={13} />
              {t("header.gstRegistered")}
            </span>
            <span className="inline-flex items-center gap-2">
              <IconTruck width={13} height={13} />
              {t("header.nationwideDelivery")}
            </span>
            <span className="inline-flex items-center gap-2">
              <IconPhone width={13} height={13} />
              +91 98765 43210
            </span>
          </div>
          <div className="flex items-center gap-5">
            {user ? (
              <>
                <Link href="/account" className="transition-colors hover:text-white">
                  {firstName}
                </Link>
                {isStaff && (
                  <Link href="/admin/dashboard" className="transition-colors hover:text-white">
                    Admin
                  </Link>
                )}
                <form action={logout}>
                  <button
                    type="submit"
                    className="uppercase tracking-[0.1em] transition-colors hover:text-white"
                  >
                    Sign Out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="transition-colors hover:text-white">
                  {t("header.signIn")}
                </Link>
                <Link
                  href="/register"
                  className="font-semibold text-white transition-colors hover:text-white/80"
                >
                  {t("header.register")}
                </Link>
              </>
            )}
            <Link href="/dealers" className="transition-colors hover:text-white">
              {t("header.becomeDealer")}
            </Link>
            <LocaleSwitch />
          </div>
        </div>
      </div>

      {/* main header */}
      <header className="sticky top-0 z-50 border-b border-line bg-paper/95 backdrop-blur">
        <div className="wrap flex items-center gap-6 py-4">
          <Brand />
          <nav className="ml-2 hidden items-center gap-7 lg:flex">
            {STOREFRONT_NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "text-[15px] font-medium transition-colors hover:text-blue",
                  isActive(n.href) ? "text-blue" : "text-ink",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Link href="/search" aria-label="Search" className={iconBtn}>
              <IconSearch width={20} height={20} />
            </Link>
            <Link href="/account" aria-label="Account" className={iconBtn}>
              <IconUser width={20} height={20} />
            </Link>
            <Link href="/wishlist" aria-label="Wishlist" className={iconBtn}>
              <IconHeart width={20} height={20} />
            </Link>
            <Link href="/cart" aria-label="Cart" className={cn(iconBtn, "relative")}>
              <IconCart width={20} height={20} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-red px-1 font-mono text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
            <Button href="/shop" size="sm" className="ml-2 hidden sm:inline-flex">
              Shop Now
            </Button>
            <button
              onClick={() => setOpen(true)}
              aria-label="Menu"
              className={cn(iconBtn, "lg:hidden")}
            >
              <IconMenu width={22} height={22} />
            </button>
          </div>
        </div>
      </header>

      {/* mobile drawer */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-[90] bg-ink/50 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        aria-label="Mobile menu"
        className={cn(
          "fixed top-0 right-0 z-[100] flex h-full w-[320px] max-w-[85vw] flex-col bg-paper shadow-[var(--shadow-3)] transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-line p-5">
          <Brand />
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-md hover:bg-paper-2"
          >
            <IconX width={20} height={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col">
            {STOREFRONT_NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "border-b border-line py-3 text-[16px] font-medium",
                  isActive(n.href) ? "text-blue" : "text-ink",
                )}
              >
                {n.label}
              </Link>
            ))}
          </div>
          <div className="mt-6 mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
            Account
          </div>
          <div className="flex flex-col gap-1 text-[15px]">
            {user ? (
              <>
                <Link href="/account" onClick={() => setOpen(false)} className="inline-flex items-center gap-3 py-2">
                  <IconUser width={18} height={18} />
                  My Account
                </Link>
                {isStaff && (
                  <Link href="/admin/dashboard" onClick={() => setOpen(false)} className="inline-flex items-center gap-3 py-2">
                    <IconUser width={18} height={18} />
                    Admin Panel
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="inline-flex items-center gap-3 py-2">
                  <IconUser width={18} height={18} />
                  Sign In
                </Link>
                <Link href="/register" onClick={() => setOpen(false)} className="inline-flex items-center gap-3 py-2">
                  <IconUser width={18} height={18} />
                  Create Account
                </Link>
              </>
            )}
            <Link href="/wishlist" onClick={() => setOpen(false)} className="inline-flex items-center gap-3 py-2">
              <IconHeart width={18} height={18} />
              Wishlist
            </Link>
            <Link href="/cart" onClick={() => setOpen(false)} className="inline-flex items-center gap-3 py-2">
              <IconCart width={18} height={18} />
              Cart
            </Link>
            <Link href="/help" onClick={() => setOpen(false)} className="inline-flex items-center gap-3 py-2">
              <IconHelp width={18} height={18} />
              Help &amp; Support
            </Link>
            {user && (
              <form action={logout}>
                <button
                  type="submit"
                  onClick={() => setOpen(false)}
                  className="inline-flex w-full items-center gap-3 py-2 text-left text-red"
                >
                  <IconUser width={18} height={18} />
                  Sign Out
                </button>
              </form>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-line p-5">
          <Button href="/shop" className="w-full justify-center">
            Shop Now
          </Button>
          <Button href="/dealers" variant="ghost" className="w-full justify-center">
            Become a Dealer
          </Button>
        </div>
      </aside>
    </>
  );
}
