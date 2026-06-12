"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/app/actions/cart";

export function AddToCartButton({
  productId,
  variantLabel,
  quantity = 1,
  className,
  children,
  doneLabel,
  ariaLabel = "Add to cart",
}: {
  productId: string;
  variantLabel?: string | null;
  quantity?: number;
  className?: string;
  children: React.ReactNode;
  doneLabel?: React.ReactNode;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await addToCart(productId, quantity, variantLabel ?? null);
          router.refresh();
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        })
      }
    >
      {done ? (doneLabel ?? "✓") : children}
    </button>
  );
}
