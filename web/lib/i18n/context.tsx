"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { dictionaries, en } from "./dict";
import type { Locale, TKey } from "./dict";
import { api } from "../api";

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
  // Track whether the user has explicitly picked a locale, so we don't
  // clobber their choice with a server-side default during boot.
  const userPicked = useRef(false);

  // Sync from storage on mount (avoids SSR/hydration mismatch — server
  // always renders English; client switches once after hydration).
  useEffect(() => {
    const initial = detectInitial();
    setLocaleState(initial);
    // If the user already had something in localStorage, treat that as
    // a deliberate choice and don't let the server overwrite it.
    if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) {
      userPicked.current = true;
    }
  }, []);

  // Hydrate from server prefs once, only if the user hasn't explicitly
  // picked a locale on this device. Fire-and-forget, swallow 401s.
  useEffect(() => {
    if (userPicked.current) return;
    let cancelled = false;
    api
      .getPrefs()
      .then((p) => {
        if (cancelled || userPicked.current) return;
        if (p.locale === "en" || p.locale === "zh") {
          setLocaleState(p.locale);
        }
      })
      .catch(() => {
        /* not signed in — fall through to local detection */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((l: Locale) => {
    userPicked.current = true;
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
    document.documentElement.lang = l;
    // Fire-and-forget persist to server. If the user isn't signed in,
    // the 401 is fine — localStorage carries the choice.
    api.setPrefs({ locale: l }).catch(() => {});
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
