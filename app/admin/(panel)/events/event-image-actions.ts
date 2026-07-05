"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type MediaKind = "event" | "training";

async function requireStaff() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || (user.role !== "ADMIN" && user.role !== "STAFF")) {
    throw new Error("Staff access required.");
  }
  return user;
}

function revalidateFor(kind: MediaKind, id: string) {
  if (kind === "event") {
    revalidatePath(`/admin/events/${id}`);
    revalidatePath("/admin/events");
  } else {
    revalidatePath(`/admin/training/${id}`);
    revalidatePath("/admin/training");
  }
}

// Attach an uploaded EVENT_MEDIA file as the cover image for an event or
// training batch. Stores file.url in imageUrl and file.id in imageFileId.
export async function setMediaImage(kind: MediaKind, id: string, fileId: string) {
  await requireStaff();
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file || file.kind !== "EVENT_MEDIA" || !file.url) throw new Error("Invalid image.");

  if (kind === "event") {
    await prisma.event.update({
      where: { id },
      data: { imageUrl: file.url, imageFileId: file.id },
    });
  } else {
    await prisma.trainingBatch.update({
      where: { id },
      data: { imageUrl: file.url, imageFileId: file.id },
    });
  }
  revalidateFor(kind, id);
}

export async function removeMediaImage(kind: MediaKind, id: string) {
  await requireStaff();
  if (kind === "event") {
    await prisma.event.update({
      where: { id },
      data: { imageUrl: null, imageFileId: null },
    });
  } else {
    await prisma.trainingBatch.update({
      where: { id },
      data: { imageUrl: null, imageFileId: null },
    });
  }
  revalidateFor(kind, id);
}
