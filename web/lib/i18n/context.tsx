"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { dictionaries, en } from "./dict";
import type { Locale, TKey } from "./dict";

const STORAGE_KEY = "starbase-locale";

interface I18nState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TKey) => string;
}

const I18nContext = createContext<I18nState>({
  locale: "en",
  setLocale: () => {},
  t: (k) => en[k],
});

function detectInitial(): Locale {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "en" || saved === "zh") return saved;
  // Fall back to browser language.
  const nav = navigator.language || "en";
  if (nav.toLowerCase().startsWith("zh")) return "zh";
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Sync from storage on mount (avoids SSR/hydration mismatch — server
  // always renders English; client switches once after hydration).
  useEffect(() => {
    setLocaleState(detectInitial());
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
    document.documentElement.lang = l;
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: TKey) => {
      const d = dictionaries[locale];
      // Fall back to English if a key is missing (shouldn't happen — typed).
      return d[key] ?? en[key];
    },
    [locale]
  );

  const value = useMemo<I18nState>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): (key: TKey) => string {
  return useContext(I18nContext).t;
}

export function useLocale() {
  const { locale, setLocale } = useContext(I18nContext);
  return { locale, setLocale };
}
