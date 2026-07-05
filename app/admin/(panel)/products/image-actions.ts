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

// Attach an uploaded File to a product as the next gallery image.
export async function addProductImage(productId: string, fileId: string) {
  await requireStaff();
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file || file.kind !== "PRODUCT_IMAGE" || !file.url) throw new Error("Invalid image.");
  if (await prisma.productImage.findUnique({ where: { fileId } })) return; // already attached
  const position = await prisma.productImage.count({ where: { productId } });
  await prisma.productImage.create({
    data: { productId, fileId, url: file.url, alt: file.alt ?? null, position },
  });
  revalidatePath(`/admin/products/${productId}/edit`);
}

export async function removeProductImage(productImageId: string) {
  await requireStaff();
  const img = await prisma.productImage.findUnique({
    where: { id: productImageId },
    include: { file: true },
  });
  if (!img) return;
  await prisma.productImage.delete({ where: { id: productImageId } });
  if (img.file) {
    await prisma.file.delete({ where: { id: img.file.id } }).catch(() => {});
    await deleteObject(img.file.key, img.file.visibility);
  }
  revalidatePath(`/admin/products/${img.productId}/edit`);
}

export async function reorderProductImages(productId: string, orderedIds: string[]) {
  await requireStaff();
  await prisma.$transaction(
    orderedIds.map((id, i) => prisma.productImage.update({ where: { id }, data: { position: i } })),
  );
  revalidatePath(`/admin/products/${productId}/edit`);
}
