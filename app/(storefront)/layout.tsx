import "./home.css";
import "./site.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import { getCartCount } from "@/lib/cart";
import { auth } from "@/lib/auth";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cartCount, session] = await Promise.all([getCartCount(), auth()]);
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader cartCount={cartCount} user={session?.user ?? null} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <CookieBanner />
      <WhatsAppFloat />
    </>
  );
}
