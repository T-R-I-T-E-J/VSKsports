"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff, audit, str } from "../_lib/admin";

/** Persist every posted field (except meta) as a Setting key/value row. */
export async function saveSettings(fd: FormData) {
  const session = await requireStaff();
  const tab = str(fd.get("__tab")) || "store";
  const entries: [string, string][] = [];
  for (const [key, value] of fd.entries()) {
    if (key.startsWith("__") || key.startsWith("$")) continue;
    entries.push([key, String(value)]);
  }
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      }),
    ),
  );
  await audit(session.user!.id!, "SETTINGS_UPDATED", "Setting", tab, `${entries.length} keys`);
  revalidatePath("/admin/settings");
}
