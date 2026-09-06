"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addAddress } from "@/app/actions/address";

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

/* ---------- Addresses ---------- */

export async function addAddressFromForm(formData: FormData): Promise<void> {
  await requireUserId();
  await addAddress({
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    line1: String(formData.get("line1") ?? "").trim(),
    line2: String(formData.get("line2") ?? "").trim() || undefined,
    city: String(formData.get("city") ?? "").trim(),
    state: String(formData.get("state") ?? "").trim(),
    pincode: String(formData.get("pincode") ?? "").trim(),
  });
  revalidatePath("/account");
  redirect("/account?tab=addr");
}

export async function setDefaultAddress(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const address = await prisma.address.findFirst({ where: { id, userId } });
  if (!address) throw new Error("Address not found");
  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
    prisma.address.update({ where: { id: address.id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/account");
}

export async function deleteAddress(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const address = await prisma.address.findFirst({ where: { id, userId } });
  if (!address) throw new Error("Address not found");
  await prisma.address.delete({ where: { id: address.id } });
  revalidatePath("/account");
}

/* ---------- Profile ---------- */

export async function updateProfile(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const marketingOptIn = formData.get("marketingOptIn") === "on";
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: name || null,
      phone: phone || null,
      location: location || null,
      marketingOptIn,
    },
  });
  revalidatePath("/profile");
  redirect("/profile?saved=profile");
}

export async function updateCommunicationPrefs(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  // Every switch on the form is persisted. Previously only `marketing` was read,
  // so the other three were silently discarded while the page still reported
  // "Preferences saved" — a customer opting out of WhatsApp kept receiving it.
  // An unchecked checkbox is simply absent from FormData, so `=== "on"` is the
  // correct read for each.
  await prisma.user.update({
    where: { id: userId },
    data: {
      marketingOptIn: formData.get("marketing") === "on",
      eventInvitesOptIn: formData.get("eventInvites") === "on",
      trainingRemindersOptIn: formData.get("trainingReminders") === "on",
      whatsappOptIn: formData.get("whatsapp") === "on",
    },
  });
  revalidatePath("/profile");
  redirect("/profile?saved=comms&s=comms");
}

/**
 * Privacy tab preferences.
 *
 * Separate from `updateCommunicationPrefs` on purpose: an unchecked checkbox is
 * absent from FormData, so a shared action would read the other form's switches
 * as "off" and silently clear them.
 */
export async function updatePrivacyPrefs(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  await prisma.user.update({
    where: { id: userId },
    data: { personalisedRecsOptIn: formData.get("personalisedRecs") === "on" },
  });
  revalidatePath("/profile");
  redirect("/profile?saved=privacy&s=privacy");
}

export async function changePassword(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next.length < 8) redirect("/profile?error=short&s=password");
  if (next !== confirm) redirect("/profile?error=mismatch&s=password");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) redirect("/profile?error=nopass&s=password");
  const ok = await bcrypt.compare(current, user!.passwordHash!);
  if (!ok) redirect("/profile?error=wrong&s=password");
  const passwordHash = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  redirect("/profile?saved=password&s=password");
}

/* ---------- Notifications ---------- */

export async function markNotificationRead(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const notif = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notif) throw new Error("Notification not found");
  if (!notif.read) {
    await prisma.notification.update({ where: { id: notif.id }, data: { read: true } });
  }
  revalidatePath("/notifications");
  if (notif.link) redirect(notif.link);
}

export async function markAllNotificationsRead(): Promise<void> {
  const userId = await requireUserId();
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  revalidatePath("/notifications");
}
