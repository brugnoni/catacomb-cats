import { createContext, useContext } from "react";
import { ES } from "./es";

export type Lang = "en" | "es";
export type Params = Record<string, string | number>;
export type Translate = (key: string, params?: Params) => string;
export const LANG_KEY = "catacomb-cats.lang";

const fill = (text: string, params?: Params) =>
  params
    ? text.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in params ? String(params[name]) : match,
      )
    : text;
/** English text is the key; Spanish comes from the dictionary and falls back to English. */
export function makeT(lang: Lang): Translate {
  return (key, params) => fill(lang === "es" ? (ES[key] ?? key) : key, params);
}
export const identityT: Translate = makeT("en");
export const LangContext = createContext<{ lang: Lang; t: Translate }>({
  lang: "en",
  t: identityT,
});
export const useT = () => useContext(LangContext);
export function loadLang(): Lang | null {
  try {
    const value = localStorage.getItem(LANG_KEY);
    return value === "en" || value === "es" ? value : null;
  } catch {
    return null;
  }
}
export function saveLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* The choice still works for this visit. */
  }
}
/** Words that have a singular and plural form in the dictionary: "{n} turn" / "{n} turns". */
export const PLURAL_WORDS = ["turn", "use", "hit"] as const;
export function plural(t: Translate, n: number, word: string): string {
  return t(`{n} ${word}${n === 1 ? "" : "s"}`, { n });
}
