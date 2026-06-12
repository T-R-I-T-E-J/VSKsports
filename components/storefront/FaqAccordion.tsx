"use client";

import { useState } from "react";

export function FaqAccordion({ items }: { items: [string, string][] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      {items.map(([q, a], i) => (
        <div className={`faq-item${open === i ? " open" : ""}`} key={i}>
          <div className="faq-q" onClick={() => setOpen(open === i ? null : i)}>
            {q}
            <span className="pm" />
          </div>
          <div className="faq-a">{a}</div>
        </div>
      ))}
    </div>
  );
}
