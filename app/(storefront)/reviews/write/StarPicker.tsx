"use client";

import { useState } from "react";

const LABELS = ["Tap to rate", "Poor", "Fair", "Good", "Very Good", "Excellent"];

const Star = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3 6.3 6.9 1-5 4.8 1.2 6.9L12 17.8 5.9 21l1.2-6.9-5-4.8 6.9-1z" />
  </svg>
);

/** Interactive 5-star rating; writes the value into a hidden form input. */
export function StarPicker({ name }: { name: string }) {
  const [value, setValue] = useState(0);
  return (
    <>
      <div className="star-pick" style={{ justifyContent: "center" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
            className={i <= value ? "on" : undefined}
            onClick={() => setValue(i)}
          >
            <Star />
          </button>
        ))}
      </div>
      <div className="mono-tag" style={{ marginTop: 8, textAlign: "center" }}>{LABELS[value]}</div>
      <input type="hidden" name={name} value={value} />
    </>
  );
}

/** Small 5-star row used for the sub-rating lines (visual only). */
export function MiniStars() {
  const [value, setValue] = useState(0);
  return (
    <div className="ministar">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
          className={i <= value ? "on" : undefined}
          onClick={() => setValue(i)}
        >
          <Star />
        </button>
      ))}
    </div>
  );
}
