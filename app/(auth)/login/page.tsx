import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { safeCallbackUrl } from "@/lib/nav";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const callbackUrl = safeCallbackUrl(sp.callbackUrl);
  return (
    <LoginForm
      heading="Sign in"
      sub="Access your orders, wishlist, rewards and more."
      callbackUrl={callbackUrl}
    />
  );
}
