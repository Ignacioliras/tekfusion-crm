import englishMessages from "ra-language-english";
import polyglotI18nProvider from "ra-i18n-polyglot";
import { spanishMessages } from "./i18n/es";

export const i18nProvider = polyglotI18nProvider(
  (locale) => (locale === "en" ? englishMessages : spanishMessages),
  "es",
  [
    { name: "es", value: "Español" },
    { name: "en", value: "English" },
  ],
  { allowMissing: true },
);
