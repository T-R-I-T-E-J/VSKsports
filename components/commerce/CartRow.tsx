"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MediaImage } from "@/components/motifs/MediaImage";
import { formatINR } from "@/lib/format";
import { updateCartItemQty, removeCartItem } from "@/app/actions/cart";

export type CartRowItem = {
  id: string;
  name: string;
  brand: string | null;
  variantLabel: string | null;
  priceInr: number;
  quantity: number;
};

export function CartRow({ item }: { item: CartRowItem }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const setQty = (q: number) =>
    start(async () => {
      await updateCartItemQty(item.id, q);
      router.refresh();
    });
  const remove = () =>
    start(async () => {
      await removeCartItem(item.id);
      router.refresh();
    });

  return (
    <div className="cart-row" style={pending ? { opacity: 0.55 } : undefined}>
      <MediaImage
        className="h-[96px] w-[96px] rounded-[8px] border border-line"
        alt={item.name}
        placeholder={item.brand ?? "VSK"}
      />
      <div>
        <div className="cart-row__brand">{item.brand}</div>
        <div className="cart-row__name">{item.name}</div>
        <div className="cart-row__meta">{item.variantLabel || "Standard"}</div>
        <div className="qty" style={{ marginTop: 10, height: 38 }}>
          <button onClick={() => setQty(item.quantity - 1)} disabled={pending} aria-label="Decrease quantity">
            −
          </button>
          <span>{item.quantity}</span>
          <button onClick={() => setQty(item.quantity + 1)} disabled={pending} aria-label="Increase quantity">
            +
          </button>
        </div>
      </div>
      <div className="cart-row__right">
        <div className="cart-row__price">{formatINR(item.priceInr * item.quantity)}</div>
        <button
          className="cart-row__rm"
          onClick={remove}
          disabled={pending}
          style={{ background: "none", border: "none" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          </svg>
          Remove
        </button>
      </div>
    </div>
  );
}
