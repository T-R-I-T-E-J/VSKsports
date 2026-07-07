import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session?.user) redirect("/");
  return <ForgotPasswordForm />;
}
