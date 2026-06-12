"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function redeemReward(formData: FormData): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const rewardItemId = String(formData.get("rewardItemId") ?? "");
  const reward = await prisma.rewardItem.findFirst({
    where: { id: rewardItemId, active: true },
  });
  if (!reward) throw new Error("Reward not found");

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.loyaltyPoints < reward.pointsCost) {
        throw new Error("INSUFFICIENT_POINTS");
      }
      await tx.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { decrement: reward.pointsCost } },
      });
      await tx.rewardRedemption.create({
        data: {
          userId,
          rewardItemId: reward.id,
          title: reward.title,
          pointsSpent: reward.pointsCost,
          status: "PENDING",
        },
      });
      await tx.rewardLedger.create({
        data: {
          userId,
          points: -reward.pointsCost,
          reason: `Redeemed: ${reward.title}`,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "INSUFFICIENT_POINTS") {
      redirect("/rewards?error=points");
    }
    throw e;
  }

  revalidatePath("/rewards");
  redirect("/rewards?redeemed=1");
}
