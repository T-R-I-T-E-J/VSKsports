"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import en from "@/messages/en.json";
import hi from "@/messages/hi.json";

export const LOCALES = ["en", "hi"] as const;
export type Locale = (typeof LOCALES)[number];

const MESSAGES: Record<Locale, Record<string, unknown>> = { en, hi };
const COOKIE = "NEXT_LOCALE";

type I18nValue = {
  locale: Locale;
  /** Dot-path lookup, e.g. t("header.signIn"). Falls back to the key. */
  t: (key: string) => string;
  setLocale: (l: Locale) => void;
};

const I18nContext = createContext<I18nValue | null>(null);

function lookup(messages: Record<string, unknown>, key: string): string {
  const value = key
    .split(".")
    .reduce<unknown>(
      (acc, k) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[k]
          : undefined,
      messages,
    );
  return typeof value === "string" ? value : key;
}

function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function I18nProvider({
  initialLocale = "en",
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Hydrate from the cookie set on a previous visit (client-only, no SSR cost).
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    const cookieLocale = match?.[1];
    if (isLocale(cookieLocale)) setLocaleState(cookieLocale);
  }, []);

  // Keep the <html lang> attribute in sync for a11y / SEO.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    document.cookie = `${COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    setLocaleState(l);
  }, []);

  const t = useCallback((key: string) => lookup(MESSAGES[locale], key), [locale]);

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}
