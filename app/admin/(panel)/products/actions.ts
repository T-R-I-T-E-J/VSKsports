"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff, audit, str, strOrNull, toInt, toIntOrNull, slugify } from "../_lib/admin";

function productData(fd: FormData) {
  const name = str(fd.get("name"));
  return {
    name,
    slug: str(fd.get("slug")) || slugify(name),
    brandId: strOrNull(fd.get("brandId")),
    categoryId: strOrNull(fd.get("categoryId")),
    caliber: strOrNull(fd.get("caliber")),
    tags: str(fd.get("tags"))
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    badge: strOrNull(fd.get("badge")),
    priceInr: toInt(fd.get("priceInr")),
    mrpInr: toIntOrNull(fd.get("mrpInr")),
    dealerPriceInr: toIntOrNull(fd.get("dealerPriceInr")),
    shortDescription: strOrNull(fd.get("shortDescription")),
    description: strOrNull(fd.get("description")),
    restricted: fd.get("restricted") === "on",
    requiresLicence: fd.get("requiresLicence") === "on",
    isActive: fd.get("isActive") === "on",
  };
}

export async function createProduct(fd: FormData) {
  const session = await requireStaff();
  const data = productData(fd);
  const product = await prisma.product.create({ data });
  await audit(session.user!.id!, "PRODUCT_CREATED", "Product", product.id, product.name);
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProduct(fd: FormData) {
  const session = await requireStaff();
  const id = str(fd.get("id"));
  const data = productData(fd);
  const product = await prisma.product.update({ where: { id }, data });
  await audit(session.user!.id!, "PRODUCT_UPDATED", "Product", product.id, product.name);
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function toggleProductActive(fd: FormData) {
  const session = await requireStaff();
  const id = str(fd.get("id"));
  const cur = await prisma.product.findUniqueOrThrow({ where: { id } });
  await prisma.product.update({ where: { id }, data: { isActive: !cur.isActive } });
  await audit(
    session.user!.id!,
    cur.isActive ? "PRODUCT_DEACTIVATED" : "PRODUCT_ACTIVATED",
    "Product",
    id,
    cur.name,
  );
  revalidatePath("/admin/products");
}
