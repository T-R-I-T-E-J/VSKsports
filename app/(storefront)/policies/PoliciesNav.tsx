"use client";

import { useEffect, useState } from "react";

type NavItem = { id: string; label: string };

/**
 * Sticky policies table-of-contents with scroll-spy.
 * - IntersectionObserver highlights the section currently in view (aria-current).
 * - Vertical sticky rail on desktop; horizontal sticky bar on mobile (≤820px),
 *   matching the page grid's collapse breakpoint so wayfinding persists on phones.
 * - In-page jumps use smooth scroll unless the visitor prefers reduced motion.
 */
export function PoliciesNav({ items }: { items: NavItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const sections = items
      .map((it) => document.getElementById(it.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (inView[0]) setActive(inView[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0 },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [items]);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setActive(id);
  }

  return (
    <nav
      aria-label="Policy sections"
      className="sticky top-[60px] z-20 -mx-4 flex gap-1 overflow-x-auto whitespace-nowrap border-b border-line bg-paper px-4 py-2 min-[821px]:top-24 min-[821px]:z-auto min-[821px]:mx-0 min-[821px]:flex-col min-[821px]:overflow-visible min-[821px]:whitespace-normal min-[821px]:border-b-0 min-[821px]:bg-transparent min-[821px]:px-0 min-[821px]:py-0"
    >
      {items.map((it) => {
        const isActive = it.id === active;
        return (
          <a
            key={it.id}
            href={`#${it.id}`}
            aria-current={isActive ? "true" : undefined}
            onClick={(e) => handleClick(e, it.id)}
            className={`shrink-0 rounded-md px-3 py-2.5 text-[14px] font-medium transition-colors ${
              isActive
                ? "bg-paper-2 text-blue"
                : "text-steel hover:bg-paper-2 hover:text-blue"
            }`}
          >
            {it.label}
          </a>
        );
      })}
    </nav>
  );
}
