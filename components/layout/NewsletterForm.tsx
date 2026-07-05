"use client";

import { useState } from "react";
import { IconArrowRight } from "@/components/icons";

export function NewsletterForm() {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p className="text-[14px] text-white" role="status">
        Subscribed — welcome to Range Notes!
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
      className="flex gap-2"
    >
      <input
        type="email"
        required
        // A temp-mail / form-filler browser extension injects style + data-*
        // attributes into email inputs before hydration; suppress the resulting
        // (harmless) mismatch warning since the cause is outside React.
        suppressHydrationWarning
        placeholder="Your email address"
        aria-label="Email address"
        className="min-w-0 flex-1 rounded-md border border-white/15 bg-white/5 px-3 py-2.5 text-[14px] text-white outline-none placeholder:text-white/40 focus:border-white/40"
      />
      <button
        type="submit"
        aria-label="Subscribe"
        className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-md bg-blue text-white transition-colors hover:bg-blue-2"
      >
        <IconArrowRight width={18} height={18} />
      </button>
    </form>
  );
}
