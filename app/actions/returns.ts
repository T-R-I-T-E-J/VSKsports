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
  const photoIds = formData.getAll("photoIds").map(String).filter(Boolean);

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

  // Nothing previously stopped the same items being returned twice, so a double
  // click produced two live RMAs for one physical item. Refunds are issued by
  // hand, so a staff member working the approval queue could legitimately refund
  // both. Items already covered by a return that has not been rejected are
  // excluded here; a REJECTED return releases its items for a fresh request.
  const alreadyReturned = await prisma.returnItem.findMany({
    where: {
      orderItemId: { in: validItems.map((i) => i.id) },
      return: { status: { not: "REJECTED" } },
    },
    select: { orderItemId: true },
  });
  const blocked = new Set(alreadyReturned.map((r) => r.orderItemId));
  const openItems = validItems.filter((i) => !blocked.has(i.id));
  if (openItems.length === 0) {
    redirect(`/returns?order=${orderId}&error=alreadyreturned`);
  }

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
        create: openItems.map((i) => ({
          orderItemId: i.id,
          name: i.name,
          quantity: i.quantity,
        })),
      },
    },
  });

  // Attach any RETURN_PHOTO files the customer uploaded. Only the current
  // user's own RETURN_PHOTO files with a published URL are attached — never
  // trust the client-passed ids alone (could reference others' uploads).
  if (photoIds.length > 0) {
    const photoFiles = await prisma.file.findMany({
      where: {
        id: { in: photoIds },
        kind: "RETURN_PHOTO",
        uploadedById: userId,
        url: { not: null },
      },
      select: { id: true, url: true },
    });
    if (photoFiles.length > 0) {
      // Preserve the upload order the customer chose.
      const ordered = photoIds
        .map((id) => photoFiles.find((f) => f.id === id))
        .filter((f): f is { id: string; url: string } => Boolean(f && f.url));
      await prisma.returnPhoto.createMany({
        data: ordered.map((f, position) => ({
          returnId: created.id,
          fileId: f.id,
          url: f.url,
          position,
        })),
      });
    }
  }

  revalidatePath("/returns");
  redirect(`/returns?submitted=${created.rmaNumber}`);
}
