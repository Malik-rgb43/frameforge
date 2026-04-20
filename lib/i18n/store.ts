"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { translate, type Lang, type TKey } from "./translations";

interface I18nState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      lang: "en",
      setLang: (l) => {
        set({ lang: l });
        if (typeof document !== "undefined") {
          document.documentElement.lang = l;
          document.documentElement.dir = l === "he" ? "rtl" : "ltr";
        }
      },
      t: (key, vars) => translate(get().lang, key, vars),
    }),
    {
      name: "ff.lang",
      partialize: (s) => ({ lang: s.lang }),
      onRehydrateStorage: () => (state) => {
        if (state && typeof document !== "undefined") {
          document.documentElement.lang = state.lang;
          document.documentElement.dir = state.lang === "he" ? "rtl" : "ltr";
        }
      },
    }
  )
);

// Convenience hook that only subscribes to `lang` + `t` (stable)
export function useT() {
  return useI18n((s) => s.t);
}

export function useLang(): [Lang, (l: Lang) => void] {
  const lang = useI18n((s) => s.lang);
  const setLang = useI18n((s) => s.setLang);
  return [lang, setLang];
}
