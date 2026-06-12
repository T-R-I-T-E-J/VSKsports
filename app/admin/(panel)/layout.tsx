import { AdminShell } from "@/components/layout/AdminShell";

// Wraps authenticated admin pages with the sidebar/topbar shell.
// /admin/login sits outside this group so it renders bare.
export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
