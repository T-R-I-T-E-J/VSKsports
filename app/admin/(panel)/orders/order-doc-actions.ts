"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteObject } from "@/lib/storage";

async function requireStaff() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || (user.role !== "ADMIN" && user.role !== "STAFF")) {
    throw new Error("Staff access required.");
  }
  return user;
}

// Attach an uploaded ORDER_DOC File (invoice / shipping label) to an order.
export async function attachOrderDoc(
  orderId: string,
  fileId: string,
  label?: string,
  docType?: string,
) {
  await requireStaff();
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file || file.kind !== "ORDER_DOC") throw new Error("Invalid document.");
  if (await prisma.orderDocument.findUnique({ where: { fileId } })) return; // already attached
  await prisma.orderDocument.create({
    data: {
      orderId,
      fileId,
      label: label ?? file.alt ?? null,
      docType: docType ?? null,
    },
  });
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function removeOrderDoc(id: string) {
  await requireStaff();
  const doc = await prisma.orderDocument.findUnique({
    where: { id },
    include: { file: true },
  });
  if (!doc) return;
  await prisma.orderDocument.delete({ where: { id } });
  if (doc.file) {
    await prisma.file.delete({ where: { id: doc.file.id } }).catch(() => {});
    await deleteObject(doc.file.key, doc.file.visibility);
  }
  revalidatePath(`/admin/orders/${doc.orderId}`);
}
