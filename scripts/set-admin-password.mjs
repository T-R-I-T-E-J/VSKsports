// Create or reset an ADMIN account in whatever database DATABASE_URL points at.
//
// This exists because there is no other way to get an admin into production:
// prisma/seed.ts calls clear() and is hard-blocked on production, and
// scripts/seed-prod-catalog.mjs deliberately never touches users.
//
// The password is read from the environment and is never printed or logged.
//
// Run:
//   DATABASE_URL="<prod url>" ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD='...' \
//     node scripts/set-admin-password.mjs
//
// Use SINGLE quotes around the password in bash — ! triggers history expansion
// in an interactive shell. In PowerShell use $env:ADMIN_PASSWORD = '...'.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";

if (!email || !email.includes("@")) {
  console.error("ADMIN_EMAIL is required (a valid email address).");
  process.exit(1);
}
if (password.length < 8) {
  // Matches the app's own minimum (app/actions/password-reset.ts).
  console.error("ADMIN_PASSWORD is required and must be at least 8 characters.");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  // Same cost factor the app uses everywhere else (lib/auth.ts compares against it).
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (existing) {
    // Only ever escalate to ADMIN, never silently demote an existing STAFF/ADMIN.
    await prisma.user.update({
      where: { email },
      data: { passwordHash, role: existing.role === "STAFF" ? "STAFF" : "ADMIN" },
    });
    console.log(`Updated password for existing ${existing.role} account: ${email}`);
  } else {
    await prisma.user.create({
      data: { email, name: "Administrator", passwordHash, role: "ADMIN" },
    });
    console.log(`Created new ADMIN account: ${email}`);
  }

  // Clear any rate-limit window this account accumulated from failed attempts,
  // so you are not locked out immediately after resetting (lib/rate-limit.ts).
  const { count } = await prisma.rateLimit.deleteMany({
    where: { key: `login:acct:${email}` },
  });
  if (count > 0) console.log("Cleared an active login rate-limit window for this account.");

  console.log("Done. Sign in at /admin/login.");
} catch (err) {
  console.error("Failed:", err.message.split("\n")[0]);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
