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

// Delete a media file. Refuses if the file is still attached somewhere
// (UPLOAD_PLAN.md §19 — "delete a File still linked → block + show references").
export async function deleteMediaFile(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireStaff();
  const file = await prisma.file.findUnique({
    where: { id },
    include: { productImage: { select: { id: true } } },
  });
  if (!file) return { ok: false, error: "File not found." };
  if (file.productImage) return { ok: false, error: "In use by a product — remove it there first." };

  await prisma.file.delete({ where: { id } });
  await deleteObject(file.key, file.visibility);
  revalidatePath("/admin/media");
  return { ok: true };
}
