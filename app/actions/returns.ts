"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ELIGIBLE_STATUSES = ["PROCESSING", "SHIPPED", "DELIVERED"] as const;

async function uniqueRmaNumber(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const candidate = `RMA-2026-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
    const existing = await prisma.return.findUnique({ where: { rmaNumber: candidate } });
    if (!existing) return candidate;
  }
  return `RMA-2026-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 10)}`;
}

export async function createReturn(formData: FormData): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const comment = String(formData.get("comment") ?? "").trim();
  const itemIds = formData.getAll("items").map(String);

  if (!reason) throw new Error("Reason is required");
  if (itemIds.length === 0) redirect(`/returns?order=${orderId}&error=noitems`);

  // Ownership + eligibility check — never trust the client-passed id alone.
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId, status: { in: [...ELIGIBLE_STATUSES] } },
    include: { items: true },
  });
  if (!order) throw new Error("Order not found or not eligible for return");

  const validItems = order.items.filter((i) => itemIds.includes(i.id));
  if (validItems.length === 0) redirect(`/returns?order=${orderId}&error=noitems`);

  const rmaNumber = await uniqueRmaNumber();
  const created = await prisma.return.create({
    data: {
      rmaNumber,
      orderId: order.id,
      userId,
      reason,
      comment: comment || null,
      status: "REQUESTED",
      items: {
        create: validItems.map((i) => ({
          orderItemId: i.id,
          name: i.name,
          quantity: i.quantity,
        })),
      },
    },
  });

  revalidatePath("/returns");
  redirect(`/returns?submitted=${created.rmaNumber}`);
}
