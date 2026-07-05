import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { safeCallbackUrl } from "@/lib/nav";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const callbackUrl = safeCallbackUrl(sp.callbackUrl);
  return <RegisterForm callbackUrl={callbackUrl} />;
}
