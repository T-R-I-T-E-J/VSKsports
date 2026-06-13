"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff, audit, str, strOrNull } from "../_lib/admin";

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "PROCESSING",
  "PAID",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

export async function updateOrderStatus(fd: FormData) {
  const session = await requireStaff();
  const id = str(fd.get("id"));
  const status = str(fd.get("status")) as OrderStatus;
  if (!ORDER_STATUSES.includes(status)) throw new Error("Invalid status");
  const trackingNumber = strOrNull(fd.get("trackingNumber"));
  const courier = strOrNull(fd.get("courier"));

  const order = await prisma.order.update({
    where: { id },
    data: {
      status,
      ...(trackingNumber !== null ? { trackingNumber } : {}),
      ...(courier !== null ? { courier } : {}),
    },
  });
  await prisma.orderEvent.create({
    data: {
      orderId: id,
      status,
      note: trackingNumber ? `Status updated · tracking ${trackingNumber}` : "Status updated by staff",
    },
  });
  await audit(
    session.user!.id!,
    "ORDER_STATUS_UPDATED",
    "Order",
    id,
    `#${order.number} → ${status}`,
  );
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
}

export async function updateOrderNotes(fd: FormData) {
  const session = await requireStaff();
  const id = str(fd.get("id"));
  const adminNotes = strOrNull(fd.get("adminNotes"));
  const order = await prisma.order.update({ where: { id }, data: { adminNotes } });
  await audit(session.user!.id!, "ORDER_NOTES_UPDATED", "Order", id, `#${order.number}`);
  revalidatePath(`/admin/orders/${id}`);
}
