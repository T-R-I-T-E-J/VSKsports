"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff, audit, str, strOrNull, toInt } from "../_lib/admin";

export async function adjustStock(fd: FormData) {
  const session = await requireStaff();
  const id = str(fd.get("id"));
  const delta = toInt(fd.get("delta"), 0);
  if (delta === 0) return;
  const reason = strOrNull(fd.get("reason")) ?? (delta > 0 ? "Stock intake" : "Stock correction");

  const item = await prisma.inventoryItem.findUniqueOrThrow({
    where: { id },
    include: { product: true },
  });
  const newStock = Math.max(0, item.stock + delta);

  await prisma.$transaction([
    prisma.inventoryItem.update({ where: { id }, data: { stock: newStock } }),
    prisma.inventoryAdjustment.create({
      data: {
        inventoryItemId: id,
        delta: newStock - item.stock,
        reason,
        staffId: session.user!.id!,
      },
    }),
  ]);
  await audit(
    session.user!.id!,
    "STOCK_ADJUSTED",
    "InventoryItem",
    id,
    `${item.sku} ${delta > 0 ? "+" : ""}${newStock - item.stock} → ${newStock}`,
  );
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/dashboard");
}
