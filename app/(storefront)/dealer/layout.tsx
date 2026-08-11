import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import "./dealer.css";

export const metadata = { title: "Dealer Portal" };

export default async function DealerLayout({ children }: { children: React.ReactNode }) {
  // SECURITY: defence in depth alongside proxy.ts — the proxy must not be the
  // sole gate on the dealer portal's pricing and invoice data.
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user) redirect("/login?callbackUrl=/dealer");
  if (role !== "DEALER" && role !== "ADMIN" && role !== "STAFF") redirect("/");

  return <>{children}</>;
}
