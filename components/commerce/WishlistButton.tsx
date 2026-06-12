"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleWishlist } from "@/app/actions/wishlist";
import { IconHeart } from "@/components/icons";

export function WishlistButton({
  productId,
  active = false,
  className,
  size = 17,
}: {
  productId: string;
  active?: boolean;
  className?: string;
  size?: number;
}) {
  const router = useRouter();
  const [on, setOn] = useState(active);
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className={className}
      aria-label={on ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={on}
      disabled={pending}
      style={on ? { color: "var(--red)", borderColor: "var(--red)" } : undefined}
      onClick={() =>
        start(async () => {
          const res = await toggleWishlist(productId);
          if (res.status === "unauthorized") {
            router.push("/login?callbackUrl=/wishlist");
            return;
          }
          setOn(res.status === "added");
          router.refresh();
        })
      }
    >
      <IconHeart width={size} height={size} />
    </button>
  );
}
