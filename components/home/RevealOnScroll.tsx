"use client";

import { useEffect } from "react";

/**
 * Scroll-reveal as progressive enhancement (mirrors the prototype): arms the
 * `.anim` gate, fades `.reveal` elements in via IntersectionObserver, and has a
 * safety timeout so nothing ever stays hidden. Respects reduced-motion.
 */
export function RevealOnScroll() {
  useEffect(() => {
    const reveals = document.querySelectorAll<HTMLElement>(".reveal");
    if (!reveals.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reveals.forEach((el) => el.classList.add("in"));
      return;
    }

    document.documentElement.classList.add("anim");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    );
    reveals.forEach((el) => io.observe(el));
    const t = setTimeout(() => reveals.forEach((el) => el.classList.add("in")), 2000);

    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);

  return null;
}
