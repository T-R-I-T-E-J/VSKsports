import { Eyebrow } from "@/components/ui/Eyebrow";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/db";

export default async function AdminDashboard() {
  const [products, orders, customers, lowStock] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.inventoryItem.count({ where: { stock: { lte: 10 } } }),
  ]);

  const kpis: [string, string | number][] = [
    ["Products", products],
    ["Orders", orders],
    ["Customers", customers],
    ["Low stock (≤10)", lowStock],
  ];

  return (
    <div>
      <Eyebrow>Overview</Eyebrow>
      <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-tight">
        Dashboard
      </h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(([label, value]) => (
          <Card key={label} className="p-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
              {label}
            </div>
            <div className="mt-2 font-display text-3xl font-extrabold">
              {value}
            </div>
          </Card>
        ))}
      </div>

      <p className="mt-8 text-steel">
        Live counts from the seeded database. Charts, tables and CRUD land in
        Phase 4.
      </p>
    </div>
  );
}
