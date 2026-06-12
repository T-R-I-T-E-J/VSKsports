import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <LoginForm
      heading="Sign in"
      sub="Access your orders, wishlist, rewards and more."
      callbackUrl="/"
    />
  );
}
