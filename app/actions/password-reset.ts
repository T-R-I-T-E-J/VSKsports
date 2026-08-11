"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email/mailer";
import { clientIp, rateLimit, retryAfterLabel } from "@/lib/rate-limit";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Reset emails per address, and per source IP, each hour.
const RESET_REQUEST_WINDOW_MS = 60 * 60 * 1000;
const RESET_MAX_PER_EMAIL = 3;
const RESET_MAX_PER_IP = 10;
// Token submissions tolerated per IP per 15 minutes.
const RESET_SUBMIT_WINDOW_MS = 15 * 60 * 1000;
const RESET_SUBMIT_MAX_PER_IP = 10;
const hashToken = (raw: string) => crypto.createHash("sha256").update(raw).digest("hex");

/**
 * Start a password reset. ALWAYS returns ok (never reveals whether an email is
 * registered). If the account exists, issues a single-use token (stored hashed,
 * 1h expiry) and emails a reset link.
 */
export async function requestPasswordReset(email: string): Promise<{ ok: true }> {
  const normalized = String(email).trim().toLowerCase();
  if (!z.string().email().safeParse(normalized).success) return { ok: true };

  // SECURITY: each call sends mail, so an unthrottled caller could bomb any
  // registered address. When the cap is hit we skip the send but still return
  // the same { ok: true } — silence here preserves the non-enumeration
  // guarantee this action is built around.
  const [byEmail, byIp] = await Promise.all([
    rateLimit(`reset-req:email:${normalized}`, RESET_MAX_PER_EMAIL, RESET_REQUEST_WINDOW_MS),
    rateLimit(`reset-req:ip:${await clientIp()}`, RESET_MAX_PER_IP, RESET_REQUEST_WINDOW_MS),
  ]);
  if (!byEmail.ok || !byIp.ok) return { ok: true };

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, name: true, passwordHash: true },
  });

  // Only issue a reset for real, password-based accounts.
  if (user?.passwordHash) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + TOKEN_TTL_MS);
    // Replace any outstanding tokens for this email, then store the new one hashed.
    await prisma.verificationToken.deleteMany({ where: { identifier: normalized } });
    await prisma.verificationToken.create({
      data: { identifier: normalized, token: hashToken(rawToken), expires },
    });

    const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const resetUrl = `${site}/reset-password?token=${rawToken}&email=${encodeURIComponent(normalized)}`;
    // Never let email problems surface to the caller (or leak existence).
    await sendPasswordResetEmail(normalized, resetUrl, user.name).catch((err) =>
      console.error("[password-reset] email failed:", err),
    );
  }

  return { ok: true };
}

export type ResetResult = { ok: true } | { ok: false; error: string };

/** Complete a password reset with a valid, unexpired token. */
export async function resetPassword(
  email: string,
  token: string,
  password: string,
): Promise<ResetResult> {
  const normalized = String(email).trim().toLowerCase();
  if (String(password).length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (!token) return { ok: false, error: "This reset link is invalid." };

  // SECURITY: throttle token submissions so the 32-byte token can't be attacked
  // by volume.
  const limited = await rateLimit(
    `reset-submit:ip:${await clientIp()}`,
    RESET_SUBMIT_MAX_PER_IP,
    RESET_SUBMIT_WINDOW_MS,
  );
  if (!limited.ok) {
    return {
      ok: false,
      error: `Too many attempts. Please try again in ${retryAfterLabel(limited.retryAfterSec)}.`,
    };
  }

  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: normalized, token: hashToken(token) } },
  });
  if (!record || record.expires < new Date()) {
    return { ok: false, error: "This reset link is invalid or has expired. Please request a new one." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { email: normalized }, data: { passwordHash } });
  // Single-use: clear all tokens for this account.
  await prisma.verificationToken.deleteMany({ where: { identifier: normalized } });

  return { ok: true };
}
