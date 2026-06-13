"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff, audit, str, strOrNull, slugify } from "../_lib/admin";

function postData(fd: FormData) {
  const title = str(fd.get("title"));
  const published = fd.get("published") === "on";
  return {
    title,
    slug: str(fd.get("slug")) || slugify(title),
    category: strOrNull(fd.get("category")),
    excerpt: strOrNull(fd.get("excerpt")),
    body: strOrNull(fd.get("body")),
    readTime: strOrNull(fd.get("readTime")),
    published,
    publishedAt: published
      ? new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" })
      : null,
  };
}

export async function createPost(fd: FormData) {
  const session = await requireStaff();
  const post = await prisma.blogPost.create({
    data: { ...postData(fd), authorId: session.user!.id! },
  });
  await audit(session.user!.id!, "BLOG_POST_CREATED", "BlogPost", post.id, post.title);
  revalidatePath("/admin/blog");
  redirect("/admin/blog");
}

export async function updatePost(fd: FormData) {
  const session = await requireStaff();
  const id = str(fd.get("id"));
  const post = await prisma.blogPost.update({ where: { id }, data: postData(fd) });
  await audit(session.user!.id!, "BLOG_POST_UPDATED", "BlogPost", post.id, post.title);
  revalidatePath("/admin/blog");
  redirect("/admin/blog");
}

export async function deletePost(fd: FormData) {
  const session = await requireStaff();
  const id = str(fd.get("id"));
  const post = await prisma.blogPost.delete({ where: { id } });
  await audit(session.user!.id!, "BLOG_POST_DELETED", "BlogPost", id, post.title);
  revalidatePath("/admin/blog");
}
