"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

  const user = await prisma.user.findUnique({ where: { id: userId } });
  await prisma.review.create({
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

  revalidatePath("/reviews/write");
  redirect("/reviews/write?submitted=1");
}
