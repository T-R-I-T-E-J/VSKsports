import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Role gate for every admin server action / page-level data helper. */
export async function requireStaff() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "STAFF") {
    throw new Error("Forbidden");
  }
  return session;
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
