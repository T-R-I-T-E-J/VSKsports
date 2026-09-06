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
      // CONCURRENCY: the balance check and the decrement are ONE conditional
      // statement. Reading the balance and then decrementing let two parallel
      // redemptions both observe the same pre-decrement total, both pass, and
      // both spend it — leaving a negative balance and two fulfilment requests
      // for one payment. `updateMany` filtered on the balance is the same lock
      // idiom `settleOrderPaid` uses: only the caller whose update matched a row
      // owns the spend.
      const spent = await tx.user.updateMany({
        where: { id: userId, loyaltyPoints: { gte: reward.pointsCost } },
        data: { loyaltyPoints: { decrement: reward.pointsCost } },
      });
      if (spent.count === 0) {
        throw new Error("INSUFFICIENT_POINTS");
      }
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
