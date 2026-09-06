"use server";

import { revalidatePath } from "next/cache";
import type { CouponType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff, audit, str, toInt, toIntOrNull } from "../_lib/admin";

/** A cap field: blank or non-positive means "no limit" (stored as NULL). */
function positiveOrNull(value: FormDataEntryValue | null): number | null {
  const n = toIntOrNull(value);
  return n != null && n > 0 ? n : null;
}

function couponData(fd: FormData) {
  const type = (str(fd.get("type")) === "PERCENT" ? "PERCENT" : "FLAT") as CouponType;
  const expiresRaw = str(fd.get("expiresAt"));
  const expiresAt = expiresRaw ? new Date(expiresRaw) : null;
  return {
    code: str(fd.get("code")).toUpperCase(),
    type,
    value: toInt(fd.get("value")),
    minOrderInr: toIntOrNull(fd.get("minOrderInr")),
    // NULL means unlimited. A zero or negative cap is rejected by a CHECK
    // constraint, so normalise "0" (a plausible way to type "no limit") to NULL
    // rather than creating a coupon nobody can ever redeem.
    maxRedemptions: positiveOrNull(fd.get("maxRedemptions")),
    perUserLimit: positiveOrNull(fd.get("perUserLimit")),
    active: fd.get("active") === "on",
    expiresAt: expiresAt && !isNaN(expiresAt.getTime()) ? expiresAt : null,
  };
}

export async function createCoupon(fd: FormData) {
  const session = await requireStaff();
  const data = couponData(fd);
  if (!data.code) throw new Error("Code required");
  const coupon = await prisma.coupon.create({ data });
  await audit(session.user!.id!, "COUPON_CREATED", "Coupon", coupon.id, coupon.code);
  revalidatePath("/admin/coupons");
}

export async function updateCoupon(fd: FormData) {
  const session = await requireStaff();
  const id = str(fd.get("id"));
  const data = couponData(fd);
  const coupon = await prisma.coupon.update({ where: { id }, data });
  await audit(session.user!.id!, "COUPON_UPDATED", "Coupon", coupon.id, coupon.code);
  revalidatePath("/admin/coupons");
}

export async function toggleCoupon(fd: FormData) {
  const session = await requireStaff();
  const id = str(fd.get("id"));
  const cur = await prisma.coupon.findUniqueOrThrow({ where: { id } });
  await prisma.coupon.update({ where: { id }, data: { active: !cur.active } });
  await audit(
    session.user!.id!,
    cur.active ? "COUPON_DEACTIVATED" : "COUPON_ACTIVATED",
    "Coupon",
    id,
    cur.code,
  );
  revalidatePath("/admin/coupons");
}

export async function deleteCoupon(fd: FormData) {
  const session = await requireStaff();
  const id = str(fd.get("id"));
  const used = await prisma.order.count({ where: { couponId: id } });
  const cur = await prisma.coupon.findUniqueOrThrow({ where: { id } });
  if (used > 0) {
    // keep referenced coupons; deactivate instead
    await prisma.coupon.update({ where: { id }, data: { active: false } });
    await audit(session.user!.id!, "COUPON_DEACTIVATED", "Coupon", id, `${cur.code} (in use)`);
  } else {
    await prisma.coupon.delete({ where: { id } });
    await audit(session.user!.id!, "COUPON_DELETED", "Coupon", id, cur.code);
  }
  revalidatePath("/admin/coupons");
}
