"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff, audit } from "../_lib/admin";
import { PRICING_KEYS, parsePricingField, type PricingKey } from "@/lib/settings";

/**
 * Persist the pricing settings.
 *
 * VALIDATED AGAINST AN ALLOW-LIST. The previous implementation looped over
 * every posted field and upserted each one as a Setting row, so a crafted POST
 * could fill the table with arbitrary keys and any value at all — including a
 * GST rate of 900, which nothing would have rejected. Now only the four known
 * keys are written, each within sane bounds, and a bad value stops the whole
 * save rather than half-applying it.
 */
export async function saveSettings(fd: FormData) {
  const session = await requireStaff();

  const parsed: { field: PricingKey; value: number }[] = [];
  for (const field of Object.keys(PRICING_KEYS) as PricingKey[]) {
    const raw = fd.get(field);
    // A field left out of the form keeps its stored value rather than resetting.
    if (raw === null) continue;
    const result = parsePricingField(field, String(raw));
    if (!result.ok) {
      redirect(`/admin/settings?error=${encodeURIComponent(result.error)}`);
    }
    parsed.push({ field, value: result.value });
  }

  if (parsed.length === 0) {
    redirect("/admin/settings?error=Nothing+to+save.");
  }

  // One transaction: a partial write would leave the shop charging a new GST
  // rate with an old shipping threshold, which is worse than either.
  await prisma.$transaction(
    parsed.map(({ field, value }) =>
      prisma.setting.upsert({
        where: { key: PRICING_KEYS[field] },
        create: { key: PRICING_KEYS[field], value: String(value) },
        update: { value: String(value) },
      }),
    ),
  );

  await audit(
    session.user!.id!,
    "SETTINGS_UPDATED",
    "Setting",
    "pricing",
    parsed.map((p) => `${p.field}=${p.value}`).join(", "),
  );

  // Pricing is rendered on the storefront, not just here.
  revalidatePath("/admin/settings");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  redirect("/admin/settings?saved=1");
}
