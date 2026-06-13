"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DealerTier } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff, audit, str, strOrNull, toIntOrNull } from "../_lib/admin";

export async function approveDealerApplication(fd: FormData) {
  const session = await requireStaff();
  const id = str(fd.get("id"));
  const tier = (str(fd.get("tier")) || "STANDARD") as DealerTier;
  const marginPct = toIntOrNull(fd.get("marginPct")) ?? 30;
  const credit = str(fd.get("credit")) || "Prepaid";
  const territory = strOrNull(fd.get("territory"));
  const creditLimitInr = toIntOrNull(fd.get("creditLimitInr"));
  const notes = strOrNull(fd.get("reviewNotes"));

  const app = await prisma.dealerApplication.findUniqueOrThrow({ where: { id } });
  const terms = `Tier: ${tier} · Margin: ${marginPct}% · Credit: ${credit}${territory ? ` · Territory: ${territory}` : ""}`;

  await prisma.$transaction(async (tx) => {
    await tx.dealerApplication.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedById: session.user!.id!,
        reviewedAt: new Date(),
        reviewNotes: notes,
        terms,
      },
    });
    // link to an existing user account if one exists
    const user =
      app.userId != null
        ? await tx.user.findUnique({ where: { id: app.userId } })
        : await tx.user.findUnique({ where: { email: app.email } });
    if (user) {
      await tx.user.update({
        where: { id: user.id },
        data: { role: "DEALER", customerType: "DEALER" },
      });
      await tx.dealerProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          businessName: app.business,
          gstNumber: app.gstNumber,
          territory: territory ?? ([app.city, app.state].filter(Boolean).join(", ") || null),
          marginPct,
          tier,
          creditLimitInr,
          approvedAt: new Date(),
        },
        update: {
          businessName: app.business,
          gstNumber: app.gstNumber,
          territory: territory ?? ([app.city, app.state].filter(Boolean).join(", ") || null),
          marginPct,
          tier,
          creditLimitInr,
          approvedAt: new Date(),
        },
      });
    }
  });

  await audit(session.user!.id!, "DEALER_APPLICATION_APPROVED", "DealerApplication", id, app.business);
  revalidatePath("/admin/dealers");
  redirect("/admin/dealers");
}

export async function rejectDealerApplication(fd: FormData) {
  const session = await requireStaff();
  const id = str(fd.get("id"));
  const notes = strOrNull(fd.get("reviewNotes"));
  const app = await prisma.dealerApplication.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewedById: session.user!.id!,
      reviewedAt: new Date(),
      reviewNotes: notes,
    },
  });
  await audit(session.user!.id!, "DEALER_APPLICATION_REJECTED", "DealerApplication", id, app.business);
  revalidatePath("/admin/dealers");
  redirect("/admin/dealers");
}
