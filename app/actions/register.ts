"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email/mailer";
import { clientIp, rateLimit, retryAfterLabel } from "@/lib/rate-limit";

// New accounts tolerated per IP per hour.
const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const REGISTER_MAX_PER_IP = 5;

const registerSchema = z.object({
  name: z.string().trim().max(80).optional(),
  email: z.string().email(),
  phone: z.string().trim().max(20).optional(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterResult = { ok: true } | { ok: false; error: string };

/**
 * Create a new CUSTOMER account. Mirrors the credential shape used by
 * lib/auth.ts::authorize (bcrypt hash + lowercased email) so the account can
 * immediately sign in via the Credentials provider. Role/customerType fall back
 * to their schema defaults (CUSTOMER / INDIVIDUAL).
 */
export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }

  // SECURITY: cap automated account creation from a single source.
  const limited = await rateLimit(
    `register:ip:${await clientIp()}`,
    REGISTER_MAX_PER_IP,
    REGISTER_WINDOW_MS,
  );
  if (!limited.ok) {
    return {
      ok: false,
      error: `Too many accounts created from this network. Please try again in ${retryAfterLabel(limited.retryAfterSec)}.`,
    };
  }

  const { name, email, phone, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: "An account with this email already exists. Try signing in." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name: name?.trim() || null,
      email: normalizedEmail,
      phone: phone?.trim() || null,
      passwordHash,
    },
  });

  // Fire-and-forget welcome email — must never block or fail registration.
  void sendWelcomeEmail({ email: normalizedEmail, name: name?.trim() || null }).catch((err) =>
    console.error("[register] welcome email failed:", err),
  );

  return { ok: true };
}
