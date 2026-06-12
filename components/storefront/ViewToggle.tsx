"use client";

import { useState } from "react";

/** Switches the listing between sidebar and top-filter layouts (matches the prototype). */
export function ViewToggle() {
  const [layout, setLayout] = useState<"sidebar" | "top">("sidebar");
  const apply = (l: "sidebar" | "top") => {
    setLayout(l);
    document.getElementById("listing")?.setAttribute("data-layout", l);
  };
  return (
    <div className="viewtoggle">
      <button
        className={layout === "sidebar" ? "active" : ""}
        aria-label="Sidebar view"
        onClick={() => apply("sidebar")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="6" height="18" rx="1" />
          <rect x="11" y="3" width="10" height="8" rx="1" />
          <rect x="11" y="13" width="10" height="8" rx="1" />
        </svg>
      </button>
      <button
        className={layout === "top" ? "active" : ""}
        aria-label="Grid view"
        onClick={() => apply("top")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </button>
    </div>
  );
}
