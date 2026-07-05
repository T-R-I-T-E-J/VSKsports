"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function requireStaff() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || (user.role !== "ADMIN" && user.role !== "STAFF")) {
    throw new Error("Staff access required.");
  }
  return user;
}

// Set an uploaded File (kind BLOG_MEDIA) as a blog post's cover image.
export async function setBlogCover(postId: string, fileId: string) {
  await requireStaff();
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file || file.kind !== "BLOG_MEDIA" || !file.url) throw new Error("Invalid image.");
  await prisma.blogPost.update({ where: { id: postId }, data: { coverImage: file.url } });
  revalidatePath(`/admin/blog/${postId}/edit`);
}

export async function removeBlogCover(postId: string) {
  await requireStaff();
  await prisma.blogPost.update({ where: { id: postId }, data: { coverImage: null } });
  revalidatePath(`/admin/blog/${postId}/edit`);
}
