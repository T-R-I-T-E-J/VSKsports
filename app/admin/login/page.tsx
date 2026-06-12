import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Admin sign in" };

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-2 px-4 py-12">
      <LoginForm
        heading="Admin sign in"
        sub="Staff access to the VSK control panel."
        callbackUrl="/admin/dashboard"
      />
    </div>
  );
}
