"use client";

import { cn } from "@/lib/cn";
import { IconGlobe } from "@/components/icons";
import { LOCALES, useI18n, type Locale } from "@/components/i18n/I18nProvider";

const LABELS: Record<Locale, string> = { en: "EN", hi: "हिं" };

/**
 * EN / हिं locale switch for the storefront utility bar. Sets the NEXT_LOCALE
 * cookie and updates messages client-side (no full navigation).
 */
export function LocaleSwitch({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <IconGlobe width={13} height={13} />
      {LOCALES.map((l, i) => (
        <span key={l} className="inline-flex items-center">
          {i > 0 && <span aria-hidden className="px-1 text-current/40">/</span>}
          <button
            type="button"
            lang={l}
            onClick={() => setLocale(l)}
            aria-pressed={locale === l}
            aria-label={`Switch to ${l === "en" ? "English" : "Hindi"}`}
            className={cn(
              "transition-colors hover:text-white",
              locale === l ? "text-white" : "text-current/65",
            )}
          >
            {LABELS[l]}
          </button>
        </span>
      ))}
    </span>
  );
}
