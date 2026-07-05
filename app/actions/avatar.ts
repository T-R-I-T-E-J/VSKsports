"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function requireUserId(): Promise<string> {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) throw new Error("You must be signed in.");
  return user.id;
}

// Attach an uploaded AVATAR File to the current user as their profile photo.
export async function updateAvatar(fileId: string): Promise<void> {
  const userId = await requireUserId();
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file || file.kind !== "AVATAR" || !file.url) throw new Error("Invalid avatar image.");
  await prisma.user.update({ where: { id: userId }, data: { image: file.url } });
  revalidatePath("/profile");
  revalidatePath("/account");
}

// Clear the current user's profile photo.
export async function removeAvatar(): Promise<void> {
  const userId = await requireUserId();
  await prisma.user.update({ where: { id: userId }, data: { image: null } });
  revalidatePath("/profile");
  revalidatePath("/account");
}
