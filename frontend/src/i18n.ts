import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import pl from "./locales/pl/common.json";
import en from "./locales/en/common.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pl: { translation: pl },
      en: { translation: en },
    },
    fallbackLng: "pl",
    supportedLngs: ["pl", "en"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
    returnNull: false,
  });

i18n.on("languageChanged", (lng) => {
  try {
    document.documentElement.setAttribute("lang", lng);
  } catch {
    /* ignore SSR */
  }
});

export default i18n;
