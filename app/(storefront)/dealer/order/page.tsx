import { PageHeader } from "@/components/storefront/PageHeader";
import { getPricingConfig } from "@/lib/settings";
import { DealerNav } from "../DealerNav";
import { requireDealerPage, getCreditUsed, getDealerProfile, getWholesaleProducts } from "../data";
import { BulkOrderForm } from "./BulkOrderForm";

export const metadata = { title: "Bulk Order" };

export default async function DealerBulkOrderPage() {
  const { userId } = await requireDealerPage();
  const pricing = await getPricingConfig();

  const [profile, creditUsed, products] = await Promise.all([
    getDealerProfile(userId),
    getCreditUsed(userId),
    getWholesaleProducts(),
  ]);

  return (
    <>
      <PageHeader
        dark
        title="Bulk Order"
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Dealer Portal", href: "/dealer" },
          { label: "Bulk Order" },
        ]}
        sub={`Wholesale pricing for ${profile?.businessName ?? "your business"} — enter quantities and place the order on your credit account.`}
        actions={<DealerNav active="/dealer/order" />}
      />

      <section className="section--tight" style={{ padding: "34px 0 64px" }}>
        <div className="wrap">
          <BulkOrderForm
            pricing={pricing}
            products={products.map((p) => ({
              id: p.id,
              name: p.name,
              brand: p.brand?.name ?? "VSK",
              retailInr: p.priceInr,
              dealerInr: p.dealerPriceInr ?? p.priceInr,
            }))}
            creditLimitInr={profile?.creditLimitInr ?? null}
            creditUsedInr={creditUsed}
          />
        </div>
      </section>
    </>
  );
}
