import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { PageHead, Crumb, Panel, InfoRow } from "../../../_lib/ui";
import { updateCustomer } from "../../actions";

export const metadata = { title: "Edit Customer — VSK Admin" };

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { orders: true } },
      orders: { where: { paymentStatus: "PAID" }, select: { totalInr: true } },
    },
  });
  if (!customer || customer.role === "ADMIN" || customer.role === "STAFF") notFound();

  const lifetime = customer.orders.reduce((s, o) => s + o.totalInr, 0);

  return (
    <div>
      <Crumb items={[["Customers", "/admin/customers"], ["Edit Customer"]]} />
      <PageHead
        title="Edit Customer"
        sub={`${customer.name ?? customer.email}`}
        actions={
          <>
            <Link href={`/admin/customers/${customer.id}`} className="btn btn--ghost btn--sm">Cancel</Link>
            <button form="cust-form" className="btn btn--primary btn--sm">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
              Save
            </button>
          </>
        }
      />

      <form id="cust-form" action={updateCustomer}>
        <input type="hidden" name="id" value={customer.id} />
        <div className="adm-grid adm-grid--2">
          {/* LEFT */}
          <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
            <Panel title="Contact Details">
              <div className="aform-grid">
                <div className="afield full">
                  <label>Full name</label>
                  <input name="name" defaultValue={customer.name ?? ""} />
                </div>
                <div className="afield">
                  <label>Email</label>
                  <input type="email" name="email" required defaultValue={customer.email} />
                </div>
                <div className="afield">
                  <label>Phone</label>
                  <input name="phone" defaultValue={customer.phone ?? ""} />
                </div>
                <div className="afield full">
                  <label>Location</label>
                  <input name="location" defaultValue={customer.location ?? ""} placeholder="City, State" />
                </div>
              </div>
            </Panel>

            <Panel title="Loyalty Adjustment">
              <div className="aform-grid">
                <div className="afield">
                  <label>Points delta</label>
                  <input name="pointsDelta" placeholder="+100 or -50" defaultValue="" />
                  <span className="hint">Applied with a RewardLedger entry on save</span>
                </div>
                <div className="afield">
                  <label>Reason</label>
                  <input name="pointsReason" placeholder="e.g. Goodwill credit" />
                </div>
              </div>
              <InfoRow k="Current points" v={customer.loyaltyPoints.toLocaleString("en-IN")} />
            </Panel>
          </div>

          {/* RIGHT */}
          <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
            <Panel title="Classification">
              <div className="afield">
                <label>Customer type</label>
                <div className="statuspick">
                  {(["INDIVIDUAL", "ACADEMY", "DEALER"] as const).map((t) => (
                    <label key={t}>
                      <input type="radio" name="customerType" value={t} defaultChecked={customer.customerType === t} />
                      <span className="sp">{t[0] + t.slice(1).toLowerCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="afield">
                <label>Account role</label>
                <select name="role" defaultValue={customer.role}>
                  <option value="CUSTOMER">Customer</option>
                  <option value="DEALER">Dealer</option>
                </select>
                <span className="hint">Role limited to Customer / Dealer</span>
              </div>
            </Panel>

            <Panel title="Account">
              <label className="switch" style={{ marginBottom: 14 }}>
                <input type="checkbox" name="marketingOptIn" defaultChecked={customer.marketingOptIn} />
                <span className="track"></span>
                <span className="sl">Marketing emails</span>
              </label>
            </Panel>

            <Panel title="Lifetime">
              <InfoRow k="Total orders" v={customer._count.orders} />
              <InfoRow k="Lifetime value" v={formatINR(lifetime)} />
              <InfoRow k="Reward points" v={customer.loyaltyPoints.toLocaleString("en-IN")} />
            </Panel>
          </div>
        </div>
      </form>
    </div>
  );
}
