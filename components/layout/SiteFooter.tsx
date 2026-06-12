import Link from "next/link";
import { Brand } from "./Brand";
import { NewsletterForm } from "./NewsletterForm";
import {
  IconInstagram,
  IconYoutube,
  IconFacebook,
  IconWhatsApp,
} from "@/components/icons";
import {
  FOOTER_SHOP,
  FOOTER_COMPANY,
  FOOTER_GROW,
  type NavLink,
} from "@/lib/nav";

function Col({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <div>
      <h5 className="font-display text-[13px] font-bold uppercase tracking-wide text-white">
        {title}
      </h5>
      <div className="mt-4 flex flex-col">
        {links.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className="py-1 text-[14px] transition-colors hover:text-white"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SiteFooter() {
  const socials = [IconInstagram, IconYoutube, IconFacebook, IconWhatsApp];
  return (
    <footer className="bg-ink text-white/65">
      <div className="wrap py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1.6fr]">
          <div>
            <Brand dark />
            <p className="mt-4 max-w-xs text-[14px]">
              India&apos;s trusted shooting sports partner — equipment, training,
              events and a nationwide dealer network.
            </p>
            <div className="mt-5 flex gap-3">
              {socials.map((Ic, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                  className="grid h-9 w-9 place-items-center rounded-md border border-white/15 transition-colors hover:border-white/40 hover:text-white"
                >
                  <Ic width={16} height={16} />
                </a>
              ))}
            </div>
          </div>
          <Col title="Shop" links={FOOTER_SHOP} />
          <Col title="Company" links={FOOTER_COMPANY} />
          <Col title="Grow With Us" links={FOOTER_GROW} />
          <div>
            <b className="font-display text-[13px] font-bold uppercase tracking-wide text-white">
              Range Notes
            </b>
            <p className="mt-3 mb-4 text-[14px]">
              New arrivals, event dates and beginner tips — once a month.
            </p>
            <NewsletterForm />
            <div className="mt-4 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-white/45">
              {["UPI", "VISA", "RUPAY", "NETBANKING", "GST INVOICE"].map((p) => (
                <span key={p} className="rounded border border-white/15 px-2 py-1">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 font-mono text-[11px] uppercase tracking-[0.08em] md:flex-row md:items-center md:justify-between">
          <span>© 2026 VSK Sports. All rights reserved.</span>
          <span className="flex flex-wrap gap-4">
            <Link href="/policies#privacy" className="hover:text-white">Privacy</Link>
            <Link href="/policies#terms" className="hover:text-white">Terms</Link>
            <Link href="/policies#shipping" className="hover:text-white">Shipping</Link>
            <Link href="/policies#returns" className="hover:text-white">Returns</Link>
            <Link href="/policies#compliance" className="hover:text-white">Compliance</Link>
            <Link href="/admin/login" className="hover:text-white">Admin</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
