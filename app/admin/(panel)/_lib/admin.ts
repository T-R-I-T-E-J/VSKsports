import { prisma } from "@/lib/db";
import { getValidatedSession } from "@/lib/session";

/**
 * Role gate for every admin server action / page-level data helper.
 *
 * The role is re-read from the database rather than trusted from the JWT.
 * Sessions are stateless, so a token minted while the user was an ADMIN kept
 * working after a demotion — both the middleware and this guard read the stale
 * copy. `getValidatedSession` also rejects tokens issued before the account's
 * session floor, so a password reset genuinely evicts an attacker.
 */
export async function requireStaff() {
  const validated = await getValidatedSession();
  if (!validated || (validated.role !== "ADMIN" && validated.role !== "STAFF")) {
    throw new Error("Forbidden");
  }
  // Shape kept compatible with the previous return value so the ~30 call sites
  // reading `session.user.id` continue to work unchanged.
  return {
    user: {
      id: validated.userId,
      role: validated.role,
      email: validated.email,
      name: validated.name,
    },
  };
}

/** Audit log — every mutating admin action records a StaffAction row. */
export async function audit(
  staffId: string,
  action: string,
  entity: string,
  entityId?: string | null,
  detail?: string | null,
) {
  await prisma.staffAction.create({
    data: { staffId, action, entity, entityId: entityId ?? null, detail: detail ?? null },
  });
}

export type SP = Record<string, string | string[] | undefined>;
export const one = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? "";

export const toInt = (v: FormDataEntryValue | null, fallback = 0): number => {
  const n = parseInt(String(v ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : fallback;
};

export const toIntOrNull = (v: FormDataEntryValue | null): number | null => {
  const s = String(v ?? "").replace(/[^\d-]/g, "");
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
};

export const str = (v: FormDataEntryValue | null): string => String(v ?? "").trim();
export const strOrNull = (v: FormDataEntryValue | null): string | null => {
  const s = String(v ?? "").trim();
  return s ? s : null;
};

export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
