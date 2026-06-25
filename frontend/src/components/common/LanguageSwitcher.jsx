import { useTranslation } from "react-i18next";
import { UI_LANGUAGES, setUiLanguage } from "@/lib/i18n";
import languages from "@/components/common/Languages";

// Maps a UI language code to its human label from the shared Languages list.
const labelFor = (code) =>
  languages.find((l) => l.value === code)?.label || code.toUpperCase();

// Compact language selector. Changing it switches the whole UI language
// (persisted to localStorage by the detector in lib/i18n.js) and, for RTL
// languages, flips <html dir>. Only offers languages that have a catalog
// (UI_LANGUAGES); the rest of the 30 chat languages fall back to English.
const LanguageSwitcher = ({ className = "" }) => {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  const value = UI_LANGUAGES.includes(current) ? current : "en";

  return (
    <select
      value={value}
      onChange={(e) => setUiLanguage(e.target.value)}
      aria-label={i18n.t("language.select")}
      className={`bg-uni-surface border border-uni-border rounded-lg text-sm text-uni-text px-2.5 py-1.5 outline-none cursor-pointer hover:border-uni-lime/50 focus:border-uni-lime/60 transition-colors ${className}`}
    >
      {UI_LANGUAGES.map((code) => (
        <option key={code} value={code} className="bg-uni-surface text-uni-text">
          {labelFor(code)}
        </option>
      ))}
    </select>
  );
};

export default LanguageSwitcher;
