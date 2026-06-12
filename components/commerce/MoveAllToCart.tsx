"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveAllWishlistToCart } from "@/app/actions/wishlist";

export function MoveAllToCart() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="btn btn--primary btn--sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await moveAllWishlistToCart();
          router.refresh();
        })
      }
    >
      <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="9" cy="21" r="1.5" />
        <circle cx="18" cy="21" r="1.5" />
        <path d="M2 3h3l2.4 12.4a2 2 0 002 1.6h8.7a2 2 0 002-1.6L23 7H6" />
      </svg>
      Move All to Cart
    </button>
  );
}
