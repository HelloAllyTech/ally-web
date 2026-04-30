import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

// Import JSON resources (one file per language)
// Using bundler module resolution: Vite + TS supports JSON imports
import { startDynamicI18n } from "./dynamic";
import { en, hi, mr, ta, kn } from "./locales";

// Keys
export const DEFAULT_FALLBACK_LNG = "en" as const;
// Expanded language support including regional/script variants where relevant
export const SUPPORTED_LANGUAGES = ["en", "hi", "mr", "ta", "kn"] as const;

const i18nInit = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr },
      ta: { translation: ta },
      kn: { translation: kn },
    },
    fallbackLng: DEFAULT_FALLBACK_LNG,
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    detection: {
      // Persist and read language from localStorage to satisfy requirement
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
    // Allow regional/script variants (e.g., pt-BR, zh-Hant)
    load: "all",
  });

void i18nInit.then(() => {
  startDynamicI18n(i18n);
});

export default i18n;
