import "./home.css";
import "./site.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import { getCartCount } from "@/lib/cart";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cartCount = await getCartCount();
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader cartCount={cartCount} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <CookieBanner />
      <WhatsAppFloat />
    </>
  );
}
