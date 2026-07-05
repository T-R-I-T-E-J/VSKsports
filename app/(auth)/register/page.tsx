import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { safeCallbackUrl } from "@/lib/nav";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const callbackUrl = safeCallbackUrl(sp.callbackUrl);
  // Already signed in? Skip the form.
  const session = await auth();
  if (session?.user) redirect(callbackUrl);
  return <RegisterForm callbackUrl={callbackUrl} />;
}
