import { redirect } from "next/navigation";
import { getValidatedSession } from "@/lib/session";
import { AdminShell } from "@/components/layout/AdminShell";
import "./admin.css";

// Wraps authenticated admin pages with the sidebar/topbar shell.
// /admin/login sits outside this group so it renders bare.
export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // SECURITY: proxy.ts also gates /admin, but a network-boundary proxy must
  // never be the ONLY authorization layer — that is the CVE-2025-29927 shape,
  // where a crafted header skipped middleware and reached the page directly.
  // Admin *actions* already call requireStaff(), so writes were covered; this
  // closes the read side (customer PII, orders, revenue) for the whole group.
  // Role comes from the database, not the JWT: a demoted admin's existing token
  // still carries the old role, and this is the read side of the panel.
  const validated = await getValidatedSession();
  if (!validated || (validated.role !== "ADMIN" && validated.role !== "STAFF")) {
    redirect("/admin/login");
  }

  return <AdminShell>{children}</AdminShell>;
}
