"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff, audit, str } from "../_lib/admin";

async function recomputeProductRating(productId: string) {
  const agg = await prisma.review.aggregate({
    _avg: { rating: true },
    _count: true,
    where: { productId, status: "APPROVED" },
  });
  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: agg._count ? Math.round((agg._avg.rating ?? 0) * 10) / 10 : null,
      reviewCount: agg._count,
    },
  });
}

export async function approveReview(fd: FormData) {
  const session = await requireStaff();
  const id = str(fd.get("id"));
  const review = await prisma.review.update({ where: { id }, data: { status: "APPROVED" } });
  await recomputeProductRating(review.productId);
  await audit(session.user!.id!, "REVIEW_APPROVED", "Review", id, `${review.rating}★ by ${review.authorName}`);
  revalidatePath("/admin/reviews");
}

export async function rejectReview(fd: FormData) {
  const session = await requireStaff();
  const id = str(fd.get("id"));
  const review = await prisma.review.update({ where: { id }, data: { status: "REJECTED" } });
  await recomputeProductRating(review.productId);
  await audit(session.user!.id!, "REVIEW_REJECTED", "Review", id, `${review.rating}★ by ${review.authorName}`);
  revalidatePath("/admin/reviews");
}
