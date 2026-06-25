// i18next setup for full UI localization (ROADMAP Phase 2). This is separate
// from per-message chat translation (services/messages.js): this localizes the
// interface chrome, picked at the landing screen and persisted in localStorage.
//
// Only the English catalog ships in the initial bundle; the other UI languages
// are lazy-loaded as separate chunks on first use (see `loaders`), so adding a
// locale costs ~nothing up front. Any code outside UI_LANGUAGES (the chat
// picker offers 30) falls back to English. RTL is applied to <html dir> on
// language change. Add a locale by dropping a JSON catalog in `locales/` and
// registering it here + in UI_LANGUAGES.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "@/locales/en.json";

// UI languages with a hand-written catalog — kept in sync with the 30 chat
// languages the translation backend serves (Languages.js `supported`) so a user
// can't pick a language whose interface silently stays English. Keep
// UI_LANGUAGES and `loaders` aligned with the JSON files in locales/, or the
// build fails to resolve a missing dynamic import.
export const UI_LANGUAGES = [
  "ar", "bn", "cs", "de", "el", "en", "es", "fa", "fr", "he",
  "hi", "hu", "id", "it", "ja", "ko", "ms", "nl", "pl", "pt",
  "ro", "ru", "sv", "th", "tl", "tr", "uk", "ur", "vi", "zh",
];

// Codes that render right-to-left (kept here so adding an RTL catalog is a
// one-line change). Matches against the base code (e.g. "ar-EG" -> "ar").
const RTL_LANGUAGES = ["ar", "he", "fa", "ur"];

// Non-English catalogs load on demand (each becomes its own bundle chunk), so
// the initial bundle ships only English regardless of how many we support.
const loaders = {
  ar: () => import("@/locales/ar.json"),
  bn: () => import("@/locales/bn.json"),
  cs: () => import("@/locales/cs.json"),
  de: () => import("@/locales/de.json"),
  el: () => import("@/locales/el.json"),
  es: () => import("@/locales/es.json"),
  fa: () => import("@/locales/fa.json"),
  fr: () => import("@/locales/fr.json"),
  he: () => import("@/locales/he.json"),
  hi: () => import("@/locales/hi.json"),
  hu: () => import("@/locales/hu.json"),
  id: () => import("@/locales/id.json"),
  it: () => import("@/locales/it.json"),
  ja: () => import("@/locales/ja.json"),
  ko: () => import("@/locales/ko.json"),
  ms: () => import("@/locales/ms.json"),
  nl: () => import("@/locales/nl.json"),
  pl: () => import("@/locales/pl.json"),
  pt: () => import("@/locales/pt.json"),
  ro: () => import("@/locales/ro.json"),
  ru: () => import("@/locales/ru.json"),
  sv: () => import("@/locales/sv.json"),
  th: () => import("@/locales/th.json"),
  tl: () => import("@/locales/tl.json"),
  tr: () => import("@/locales/tr.json"),
  uk: () => import("@/locales/uk.json"),
  ur: () => import("@/locales/ur.json"),
  vi: () => import("@/locales/vi.json"),
  zh: () => import("@/locales/zh.json"),
};
const loaded = new Set(["en"]);

const applyDirection = (lng) => {
  const base = (lng || "en").split("-")[0];
  document.documentElement.lang = base;
  document.documentElement.dir = RTL_LANGUAGES.includes(base) ? "rtl" : "ltr";
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en } },
    fallbackLng: "en",
    supportedLngs: UI_LANGUAGES,
    // Treat "fr-FR" as "fr" rather than falling straight back to English.
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false }, // React already escapes
    // Catalogs load asynchronously; render the fallback (English) meanwhile
    // instead of suspending the tree.
    react: { useSuspense: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "uiLang",
      caches: ["localStorage"],
    },
  });

// Load a language's catalog once (no-op for English / already-loaded / unknown).
const ensureCatalog = async (base) => {
  if (loaded.has(base) || !loaders[base]) return;
  try {
    const mod = await loaders[base]();
    i18n.addResourceBundle(base, "translation", mod.default || mod, true, true);
    loaded.add(base);
  } catch (err) {
    console.error("Failed to load locale catalog:", base, err);
  }
};

// Switch the UI language, lazy-loading its catalog first. Use this everywhere
// instead of i18n.changeLanguage so the strings are present before the switch.
export const setUiLanguage = async (lng) => {
  const base = (lng || "en").split("-")[0];
  await ensureCatalog(base);
  await i18n.changeLanguage(base);
};

applyDirection(i18n.resolvedLanguage || i18n.language);
i18n.on("languageChanged", applyDirection);

// On boot, if the detected/persisted language isn't English, pull its catalog
// (brief English render for non-en users until the chunk arrives).
const detected = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
if (detected !== "en") setUiLanguage(detected);

export default i18n;
