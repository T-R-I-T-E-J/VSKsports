"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export async function submitReview(formData: FormData): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const orderItemId = String(formData.get("orderItemId") ?? "");
  const rating = Math.max(1, Math.min(5, Number(formData.get("rating") ?? 0)));
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!Number.isFinite(rating) || rating < 1) {
    redirect(`/reviews/write?item=${orderItemId}&error=rating`);
  }
  if (!body) redirect(`/reviews/write?item=${orderItemId}&error=body`);

  // Verify the item belongs to one of this user's orders (verified purchase).
  const orderItem = await prisma.orderItem.findFirst({
    where: { id: orderItemId, order: { userId } },
    include: { order: { select: { id: true } } },
  });
  if (!orderItem || !orderItem.productId) {
    throw new Error("Purchased product not found");
  }

  // One review per customer per product. Purchase verification alone did not
  // stop the SAME purchase being reviewed repeatedly, so a single buyer could
  // post any number of reviews for one product and move its rating at will.
  const existing = await prisma.review.findFirst({
    where: { userId, productId: orderItem.productId },
    select: { id: true },
  });
  if (existing) {
    redirect(`/reviews/write?item=${orderItemId}&error=duplicate`);
  }

  // Belt and braces against automated submission, including across products.
  const limited = await rateLimit(`review:user:${userId}`, 10, 60 * 60 * 1000);
  if (!limited.ok) {
    redirect(`/reviews/write?item=${orderItemId}&error=ratelimit`);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const review = await prisma.review.create({
    data: {
      productId: orderItem.productId,
      userId,
      authorName: user?.name ?? "VSK Customer",
      rating,
      title: title || null,
      body,
      status: "PENDING",
      orderId: orderItem.order.id,
    },
  });

  // Attach any uploaded review photos. Each hidden `photoIds` input maps to a
  // File the uploader already created (kind REVIEW_PHOTO). Only attach Files
  // that exist, are REVIEW_PHOTO, belong to this user, and have a public URL —
  // then create one ReviewPhoto row per photo with its position preserved.
  const photoIds = formData
    .getAll("photoIds")
    .map((v) => String(v))
    .filter((v) => v.length > 0);

  if (photoIds.length > 0) {
    const files = await prisma.file.findMany({
      where: {
        id: { in: photoIds },
        kind: "REVIEW_PHOTO",
        uploadedById: userId,
        url: { not: null },
      },
      select: { id: true, url: true },
    });
    const byId = new Map(files.map((f) => [f.id, f]));

    // Preserve submission order; dedupe; skip Files that failed validation.
    const seen = new Set<string>();
    const rows: { reviewId: string; fileId: string; url: string; position: number }[] = [];
    for (const id of photoIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      const file = byId.get(id);
      if (!file || !file.url) continue;
      rows.push({ reviewId: review.id, fileId: file.id, url: file.url, position: rows.length });
    }

    if (rows.length > 0) {
      await prisma.reviewPhoto.createMany({ data: rows });
    }
  }

  revalidatePath("/reviews/write");
  redirect("/reviews/write?submitted=1");
}
