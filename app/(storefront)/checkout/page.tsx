import Link from "next/link";
import { getPricingConfig } from "@/lib/settings";
import { checkCoupon } from "@/lib/coupons";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCart } from "@/lib/cart";
import { CheckoutFlow } from "@/components/commerce/CheckoutFlow";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/checkout");

  const cart = await getCart();
  const items = cart?.items ?? [];
  if (items.length === 0) redirect("/cart");

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  const subtotalInr = items.reduce((s, i) => s + i.product.priceInr * i.quantity, 0);
  const pricing = await getPricingConfig();
  // Same re-validation as the cart page: the stored code is checked against the
  // live coupon row so the summary cannot promise a discount checkout will refuse.
  const applied = cart?.couponCode
    ? await checkCoupon(cart.couponCode, subtotalInr, session?.user?.id ?? null)
    : null;
  const discountInr = applied?.ok ? applied.discountInr : 0;
  const mini = items.map((i) => ({
    name: i.product.name,
    meta: [i.variantLabel || null, `Qty ${i.quantity}`].filter(Boolean).join(" · "),
    priceInr: i.product.priceInr * i.quantity,
  }));

  return (
    <>
      <div className="wrap" style={{ paddingTop: 26 }}>
        <nav className="breadcrumb">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <Link href="/cart">Cart</Link>
          <span className="sep">/</span>
          <span className="cur">Checkout</span>
        </nav>
      </div>

      <section className="section--tight" style={{ padding: "24px 0 80px" }}>
        <div className="wrap">
          <CheckoutFlow
            pricing={pricing}
            discountInr={discountInr}
            couponCode={cart?.couponCode ?? null}
            addresses={addresses.map((a) => ({
              id: a.id,
              name: a.name,
              line1: a.line1,
              line2: a.line2,
              city: a.city,
              state: a.state,
              pincode: a.pincode,
              phone: a.phone,
              isDefault: a.isDefault,
            }))}
            items={mini}
            subtotalInr={subtotalInr}
            user={{ name: session.user.name ?? "", email: session.user.email ?? "" }}
          />
        </div>
      </section>
    </>
  );
}
