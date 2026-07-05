import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { safeCallbackUrl } from "@/lib/nav";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const callbackUrl = safeCallbackUrl(sp.callbackUrl);
  // Already signed in? Don't show the form — go where they were headed.
  const session = await auth();
  if (session?.user) redirect(callbackUrl);
  return (
    <LoginForm
      heading="Sign in"
      sub="Access your orders, wishlist, rewards and more."
      callbackUrl={callbackUrl}
    />
  );
}
