"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TrainingLevel, RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff, audit, str, strOrNull, toIntOrNull, slugify } from "../_lib/admin";

function batchData(fd: FormData) {
  const title = str(fd.get("title"));
  const level = str(fd.get("level")) as TrainingLevel;
  return {
    title,
    slug: str(fd.get("slug")) || slugify(title),
    date: str(fd.get("date")) || "TBA",
    location: strOrNull(fd.get("location")),
    duration: strOrNull(fd.get("duration")),
    level: (["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(level) ? level : "BEGINNER") as TrainingLevel,
    priceInr: toIntOrNull(fd.get("priceInr")),
    capacity: toIntOrNull(fd.get("capacity")),
    spotsNote: strOrNull(fd.get("spotsNote")),
  };
}

export async function createBatch(fd: FormData) {
  const session = await requireStaff();
  const batch = await prisma.trainingBatch.create({ data: batchData(fd) });
  await audit(session.user!.id!, "TRAINING_BATCH_CREATED", "TrainingBatch", batch.id, batch.title);
  revalidatePath("/admin/training");
  redirect("/admin/training");
}

export async function updateBatch(fd: FormData) {
  const session = await requireStaff();
  const id = str(fd.get("id"));
  const batch = await prisma.trainingBatch.update({ where: { id }, data: batchData(fd) });
  await audit(session.user!.id!, "TRAINING_BATCH_UPDATED", "TrainingBatch", batch.id, batch.title);
  revalidatePath("/admin/training");
  revalidatePath(`/admin/training/${id}`);
}

export async function updateTrainingRegistration(fd: FormData) {
  const session = await requireStaff();
  const id = str(fd.get("id"));
  const status = str(fd.get("status")) as RegistrationStatus;
  if (!["PENDING", "CONFIRMED", "CANCELLED", "WAITLIST"].includes(status)) throw new Error("Invalid status");
  const reg = await prisma.trainingRegistration.update({ where: { id }, data: { status } });
  await audit(
    session.user!.id!,
    "TRAINING_REGISTRATION_UPDATED",
    "TrainingRegistration",
    id,
    `${reg.name} → ${status}`,
  );
  revalidatePath(`/admin/training/${reg.batchId}`);
}
