// One-shot: create (or reset) the production ADMIN account.
//
// Reads DATABASE_URL and SEED_PASSWORD from .env.production.local, which is
// produced by:
//   npx vercel env pull .env.production.local --environment=production
//
// Uses the SEED_PASSWORD already stored in Vercel as the admin password, so no
// new credential is invented. Nothing secret is printed.
//
// Run from the vsk-sports directory:  node scripts/provision-prod-admin.mjs
import { readFile } from "node:fs/promises";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const ENV_FILE = ".env.production.local";
const EMAIL = process.env.ADMIN_EMAIL || "admin@vsksports.in";

let raw;
try {
  raw = await readFile(ENV_FILE, "utf8");
} catch {
  console.error(`Missing ${ENV_FILE}. Run:`);
  console.error("  npx vercel env pull .env.production.local --environment=production");
  process.exit(1);
}

const env = {};
for (const line of raw.split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)="?(.*?)"?$/.exec(line.trim());
  if (m) env[m[1]] = m[2];
}

// Prefer the DIRECT (non-pooled) endpoint for a one-shot write, and strip
// `channel_binding=require`: Neon accepts it but Prisma's query engine cannot
// negotiate channel binding, and reports the failed TLS handshake misleadingly
// as "Can't reach database server".
function connectionUrl() {
  const chosen = env.DIRECT_URL || env.DATABASE_URL;
  if (!chosen) return null;
  const u = new URL(chosen);
  u.searchParams.delete("channel_binding");
  if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
  return u.toString();
}

const url = connectionUrl();
const password = process.env.ADMIN_PASSWORD || env.SEED_PASSWORD;

if (!url) {
  console.error(`Neither DIRECT_URL nor DATABASE_URL found in ${ENV_FILE}.`);
  process.exit(1);
}
if (!password || password.length < 8) {
  console.error("No usable password: set SEED_PASSWORD in Vercel, or pass ADMIN_PASSWORD.");
  process.exit(1);
}

console.log("database host :", new URL(url).host);
console.log("admin email   :", EMAIL);
console.log("password      : taken from SEED_PASSWORD (not displayed)");

const prisma = new PrismaClient({ datasources: { db: { url } } });
try {
  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "STAFF"] } },
    select: { email: true, role: true },
  });
  console.log(`\nexisting staff/admin accounts: ${staff.length}`);
  for (const s of staff) console.log(`   ${s.email}  ${s.role}`);

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email: EMAIL }, select: { role: true } });

  if (existing) {
    // Only ever escalate to ADMIN; never silently demote an existing STAFF user.
    await prisma.user.update({
      where: { email: EMAIL },
      data: { passwordHash, role: existing.role === "STAFF" ? "STAFF" : "ADMIN" },
    });
    console.log(`\nUPDATED password for existing ${existing.role}: ${EMAIL}`);
  } else {
    await prisma.user.create({
      data: { email: EMAIL, name: "Administrator", passwordHash, role: "ADMIN" },
    });
    console.log(`\nCREATED new ADMIN account: ${EMAIL}`);
  }

  // Clear any lockout accumulated from the failed attempts so far, otherwise the
  // first try after this could still be rejected (lib/rate-limit.ts).
  const cleared = await prisma.rateLimit.deleteMany({ where: { key: `login:acct:${EMAIL}` } });
  if (cleared.count) console.log("cleared an active login rate-limit window");

  const check = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { passwordHash: true, role: true },
  });
  console.log("\nverify -> role:", check.role, "| password matches:", await bcrypt.compare(password, check.passwordHash));
  console.log("\nSign in at https://www.webtesters.space/admin/login");
  console.log("Password = the SEED_PASSWORD value in Vercel > Settings > Environment Variables.");
} finally {
  await prisma.$disconnect();
}
