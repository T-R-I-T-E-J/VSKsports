"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

const KEY = "vsk_cookie_ok";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      // localStorage is unavailable during SSR, so the banner's visibility can
      // only be resolved after mount. Runs once and settles; does not cascade.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only read
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return (
    <div className="fixed bottom-5 left-5 z-[120] max-w-sm rounded-lg border border-line bg-paper p-5 shadow-[var(--shadow-3)]">
      <b className="font-display text-[15px] uppercase tracking-tight">
        We use cookies
      </b>
      <p className="mt-2 text-[14px] text-steel">
        We use cookies to improve your experience, remember your cart, and
        analyse traffic. See our{" "}
        <Link href="/policies#privacy" className="text-blue underline">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="mt-4 flex gap-2">
        <Button size="sm" onClick={dismiss}>
          Accept All
        </Button>
        <Button size="sm" variant="ghost" onClick={dismiss}>
          Essential Only
        </Button>
      </div>
    </div>
  );
}
