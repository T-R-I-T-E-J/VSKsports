import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { randomUUID } from "node:crypto";

const authMock = vi.fn();
const getCartMock = vi.fn();
const ordersCreateMock = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/cart", () => ({ getCart: getCartMock }));

// A stand-in gateway. The point of these tests is what reaches Razorpay — the
// amount, and whether the call happens at all — not Razorpay itself.
vi.mock("@/lib/razorpay", () => ({
  isRazorpayConfigured: true,
  RAZORPAY_KEY_ID: "rzp_test_fake",
  razorpay: { orders: { create: (...args: unknown[]) => ordersCreateMock(...args) } },
  verifyPaymentSignature: () => false,
}));

const { startCheckout } = await import("@/app/actions/checkout");
const { prisma, createUser, createProduct, cleanup } = await import("@/test/fixtures");

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

beforeEach(() => {
  authMock.mockReset();
  getCartMock.mockReset();
  ordersCreateMock.mockReset();
  // Unique per call: Order.razorpayOrderId is @unique, so a fixed id would
  // collide across tests and across runs.
  ordersCreateMock.mockImplementation(async () => ({
    id: `order_gateway_fake_${randomUUID()}`,
  }));
});

/** Build the cart shape `getCart()` returns, with the product rows inlined. */
function cartWith(
  items: { productId: string; priceInr: number; quantity: number; isActive?: boolean; name?: string }[],
  userId: string,
) {
  return {
    id: "cart_test",
    token: "tok_test",
    userId,
    items: items.map((i, n) => ({
      id: `ci_${n}`,
      cartId: "cart_test",
      productId: i.productId,
      variantLabel: null,
      quantity: i.quantity,
      product: {
        id: i.productId,
        name: i.name ?? "Test Rifle",
        priceInr: i.priceInr,
        isActive: i.isActive ?? true,
      },
    })),
  };
}

async function customerWithAddress() {
  const user = await createUser();
  const address = await prisma.address.create({
    data: {
      userId: user.id,
      name: "Test Buyer",
      line1: "1 Range Road",
      city: "Nagpur",
      state: "MH",
      pincode: "440010",
      phone: "+91 90000 00000",
    },
  });
  authMock.mockResolvedValue({ user: { id: user.id, role: "CUSTOMER" } });
  return { user, address };
}

describe("startCheckout", () => {
  /**
   * Regression guard for audit finding N-1.
   *
   * `toggleProductActive` is the only way staff withdraw a product — there is no
   * delete — but neither the cart nor checkout consulted `isActive`. A rifle
   * pulled for a recall or a compliance reason stayed purchasable from any cart
   * that predated the withdrawal.
   */
  it("refuses to charge for a withdrawn product", async () => {
    const { user, address } = await customerWithAddress();
    const { productId } = await createProduct({ stock: 5, priceInr: 10_000 });
    getCartMock.mockResolvedValue(
      cartWith(
        [{ productId, priceInr: 10_000, quantity: 1, isActive: false, name: "Recalled Rifle" }],
        user.id,
      ),
    );

    await expect(startCheckout(address.id, "standard")).rejects.toThrow(/no longer available/i);
    // Nothing may reach the gateway for goods that cannot be sold.
    expect(ordersCreateMock).not.toHaveBeenCalled();
  });

  it("prices the order from the database, not the cart's own figures", async () => {
    const { user, address } = await customerWithAddress();
    const { productId } = await createProduct({ stock: 5, priceInr: 50_000 });
    getCartMock.mockResolvedValue(
      cartWith([{ productId, priceInr: 50_000, quantity: 2 }], user.id),
    );

    const result = await startCheckout(address.id, "standard");

    const order = await prisma.order.findUnique({ where: { id: result.orderId } });
    expect(order?.subtotalInr).toBe(100_000);
    // The gateway is charged the stored total, in paise.
    expect(result.amount).toBe(order!.totalInr * 100);
    expect(ordersCreateMock).toHaveBeenCalledOnce();
  });

  it("rejects a shipping method the UI never offers", async () => {
    const { user, address } = await customerWithAddress();
    const { productId } = await createProduct({ stock: 5 });
    getCartMock.mockResolvedValue(cartWith([{ productId, priceInr: 10_000, quantity: 1 }], user.id));

    // Server Action arguments are attacker-controlled and types are erased at
    // runtime, so an unrecognised method must be refused, not defaulted.
    await expect(
      startCheckout(address.id, "free-of-charge" as unknown as "standard"),
    ).rejects.toThrow(/valid delivery method/i);
    expect(ordersCreateMock).not.toHaveBeenCalled();
  });

  it("rejects a negative quantity rather than discounting the charge", async () => {
    const { user, address } = await customerWithAddress();
    const { productId } = await createProduct({ stock: 5 });
    getCartMock.mockResolvedValue(
      cartWith([{ productId, priceInr: 10_000, quantity: -5 }], user.id),
    );

    await expect(startCheckout(address.id, "standard")).rejects.toThrow(/invalid quantity/i);
    expect(ordersCreateMock).not.toHaveBeenCalled();
  });

  it("refuses an address belonging to another customer", async () => {
    const { address } = await customerWithAddress();
    const attacker = await createUser();
    const { productId } = await createProduct({ stock: 5 });
    authMock.mockResolvedValue({ user: { id: attacker.id, role: "CUSTOMER" } });
    getCartMock.mockResolvedValue(
      cartWith([{ productId, priceInr: 10_000, quantity: 1 }], attacker.id),
    );

    await expect(startCheckout(address.id, "standard")).rejects.toThrow(/valid delivery address/i);
  });

  it("refuses to sell more units than are in stock", async () => {
    const { user, address } = await customerWithAddress();
    const { productId } = await createProduct({ stock: 2 });
    getCartMock.mockResolvedValue(cartWith([{ productId, priceInr: 10_000, quantity: 5 }], user.id));

    await expect(startCheckout(address.id, "standard")).rejects.toThrow(/out of stock/i);
    expect(ordersCreateMock).not.toHaveBeenCalled();
  });

  it("rejects an anonymous caller", async () => {
    authMock.mockResolvedValue(null);
    await expect(startCheckout("addr", "standard")).rejects.toThrow("Not authenticated");
  });
});
