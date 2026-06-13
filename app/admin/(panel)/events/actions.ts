"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EventStatus, RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff, audit, str, strOrNull, toIntOrNull, slugify } from "../_lib/admin";

function eventData(fd: FormData) {
  const title = str(fd.get("title"));
  const status = str(fd.get("status")) as EventStatus;
  return {
    title,
    slug: str(fd.get("slug")) || slugify(title),
    date: str(fd.get("date")) || "TBA",
    location: strOrNull(fd.get("location")),
    category: strOrNull(fd.get("category")),
    status: (["UPCOMING", "LIVE", "PAST"].includes(status) ? status : "UPCOMING") as EventStatus,
    prizePoolInr: toIntOrNull(fd.get("prizePoolInr")),
    capacity: toIntOrNull(fd.get("capacity")),
  };
}

export async function createEvent(fd: FormData) {
  const session = await requireStaff();
  const event = await prisma.event.create({ data: eventData(fd) });
  await audit(session.user!.id!, "EVENT_CREATED", "Event", event.id, event.title);
  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export async function updateEvent(fd: FormData) {
  const session = await requireStaff();
  const id = str(fd.get("id"));
  const event = await prisma.event.update({ where: { id }, data: eventData(fd) });
  await audit(session.user!.id!, "EVENT_UPDATED", "Event", event.id, event.title);
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
}

export async function updateEventRegistration(fd: FormData) {
  const session = await requireStaff();
  const id = str(fd.get("id"));
  const status = str(fd.get("status")) as RegistrationStatus;
  if (!["PENDING", "CONFIRMED", "CANCELLED", "WAITLIST"].includes(status)) throw new Error("Invalid status");
  const reg = await prisma.eventRegistration.update({ where: { id }, data: { status } });
  await audit(
    session.user!.id!,
    "EVENT_REGISTRATION_UPDATED",
    "EventRegistration",
    id,
    `${reg.name} → ${status}`,
  );
  revalidatePath(`/admin/events/${reg.eventId}`);
}
