"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS: [string, string][] = [
  ["featured", "Sort: Featured"],
  ["price-asc", "Price: Low to High"],
  ["price-desc", "Price: High to Low"],
  ["rating", "Top Rated"],
  ["new", "New Arrivals"],
];

export function SortSelect() {
  const router = useRouter();
  const sp = useSearchParams();
  const current = sp.get("sort") ?? "featured";

  return (
    <div className="selectbox">
      <select
        aria-label="Sort"
        value={current}
        onChange={(e) => {
          const params = new URLSearchParams(sp.toString());
          if (e.target.value === "featured") params.delete("sort");
          else params.set("sort", e.target.value);
          params.delete("page");
          const s = params.toString();
          router.push(s ? `/shop?${s}` : "/shop");
        }}
      >
        {OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}
