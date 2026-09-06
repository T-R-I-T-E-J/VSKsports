"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const str = (v: FormDataEntryValue | null): string => String(v ?? "").trim();
const strOrNull = (v: FormDataEntryValue | null): string | null => {
  const s = str(v);
  return s.length ? s : null;
};

// Customer-facing dealer application. Creates the DealerApplication, then
// attaches any uploaded DEALER_DOC files (GST cert / trade licence) as
// DealerDocument rows. Documents are only linked if they are kind DEALER_DOC
// and were uploaded by the current signed-in user (ownership guard).
export async function submitDealerApplication(fd: FormData): Promise<void> {
  const session = await auth();
  const user = session?.user as { id?: string } | undefined;

  const business = str(fd.get("business"));
  const contactName = str(fd.get("contactName"));
  const phone = strOrNull(fd.get("phone"));
  const email = str(fd.get("email"));
  const city = strOrNull(fd.get("city"));
  const gstNumber = strOrNull(fd.get("gstNumber"));
  const businessType = strOrNull(fd.get("businessType"));
  const yearsInBusiness = strOrNull(fd.get("yearsInBusiness"));
  const message = strOrNull(fd.get("message"));

  if (!business || !contactName || !email) {
    redirect("/dealers?error=missing#apply");
  }

  // This action is reachable without a session and writes a row plus attached
  // documents, so it is throttled per source. Applying to become a dealer is a
  // once-in-a-business-lifetime act; a low ceiling costs nobody anything.
  const limited = await rateLimit(
    user?.id ? `dealer-app:user:${user.id}` : `dealer-app:ip:${await clientIp()}`,
    5,
    24 * 60 * 60 * 1000,
  );
  if (!limited.ok) {
    redirect("/dealers?error=ratelimit#apply");
  }

  // docIds are File ids produced by the DealerDocUploader (DEALER_DOC kind).
  const docIds = fd
    .getAll("docIds")
    .map((v) => String(v))
    .filter(Boolean);

  const application = await prisma.dealerApplication.create({
    data: {
      // Link to the signed-in account when present so the owner can later
      // download their own private documents via /api/files/<id>.
      ...(user?.id ? { userId: user.id } : {}),
      business,
      contactName,
      email,
      phone,
      city,
      gstNumber,
      businessType,
      yearsInBusiness,
      message,
    },
  });

  if (docIds.length) {
    // Only attach files that are DEALER_DOC and owned by the current user,
    // and not already linked to another application.
    const files = await prisma.file.findMany({
      where: {
        id: { in: docIds },
        kind: "DEALER_DOC",
        ...(user?.id ? { uploadedById: user.id } : {}),
        dealerDocument: null,
      },
      select: { id: true, key: true },
    });

    if (files.length) {
      await prisma.dealerDocument.createMany({
        data: files.map((f) => ({
          applicationId: application.id,
          fileId: f.id,
          label: f.key.split("/").pop() ?? null,
        })),
      });
    }
  }

  redirect("/dealers?applied=1#apply");
}
