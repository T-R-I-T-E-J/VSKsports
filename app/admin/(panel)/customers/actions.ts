"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CustomerType, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff, audit, str, strOrNull, toInt } from "../_lib/admin";

export async function updateCustomer(fd: FormData) {
  const session = await requireStaff();
  const id = str(fd.get("id"));
  const customerType = str(fd.get("customerType")) as CustomerType;
  if (!["INDIVIDUAL", "ACADEMY", "DEALER"].includes(customerType)) throw new Error("Invalid type");
  const role = str(fd.get("role")) as Role;
  if (!["CUSTOMER", "DEALER"].includes(role)) throw new Error("Role limited to CUSTOMER/DEALER");

  const existing = await prisma.user.findUniqueOrThrow({ where: { id } });
  if (existing.role === "ADMIN" || existing.role === "STAFF") {
    throw new Error("Cannot edit staff accounts here");
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: strOrNull(fd.get("name")),
      email: str(fd.get("email")),
      phone: strOrNull(fd.get("phone")),
      location: strOrNull(fd.get("location")),
      customerType,
      role,
      marketingOptIn: fd.get("marketingOptIn") === "on",
    },
  });
  await audit(session.user!.id!, "CUSTOMER_UPDATED", "User", user.id, user.email);

  // loyalty point adjustment with reward ledger entry
  const delta = toInt(fd.get("pointsDelta"), 0);
  if (delta !== 0) {
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { loyaltyPoints: { increment: delta } } }),
      prisma.rewardLedger.create({
        data: {
          userId: id,
          points: delta,
          reason: strOrNull(fd.get("pointsReason")) ?? "Manual adjustment by staff",
        },
      }),
    ]);
    await audit(
      session.user!.id!,
      "LOYALTY_ADJUSTED",
      "User",
      id,
      `${delta > 0 ? "+" : ""}${delta} pts`,
    );
  }

  revalidatePath(`/admin/customers/${id}`);
  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${id}`);
}

export async function addCustomerNote(fd: FormData) {
  const session = await requireStaff();
  const userId = str(fd.get("userId"));
  const body = str(fd.get("body"));
  if (!body) return;
  await prisma.customerNote.create({
    data: { userId, authorId: session.user!.id!, body },
  });
  await audit(session.user!.id!, "CUSTOMER_NOTE_ADDED", "User", userId, body.slice(0, 80));
  revalidatePath(`/admin/customers/${userId}`);
}
