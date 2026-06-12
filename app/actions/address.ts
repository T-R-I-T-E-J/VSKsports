"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function addAddress(input: {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}): Promise<{ id: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const count = await prisma.address.count({ where: { userId } });
  const address = await prisma.address.create({
    data: {
      userId,
      name: input.name,
      phone: input.phone,
      line1: input.line1,
      line2: input.line2 || null,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      isDefault: count === 0,
    },
  });
  revalidatePath("/checkout");
  return { id: address.id };
}
