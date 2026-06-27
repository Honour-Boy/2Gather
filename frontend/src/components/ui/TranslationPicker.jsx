import { useEffect, useState } from "react";
import useTranslationStore from "@/store/translationStore";
import { fetchTranslations } from "@/lib/verses";

// A compact Bible-translation selector. The choice is stored globally
// (translationStore) and applied to every verse request across the app.
export default function TranslationPicker({ className = "" }) {
  const { translation, setTranslation } = useTranslationStore();
  const [options, setOptions] = useState([{ abbr: "WEB", name: "World English Bible" }]);

  useEffect(() => {
    let active = true;
    fetchTranslations()
      .then((list) => active && list.length && setOptions(list))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <label className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-uni-muted">
        Version
      </span>
      <select
        value={translation}
        onChange={(e) => setTranslation(e.target.value)}
        aria-label="Bible translation"
        className="text-xs font-semibold text-uni-text bg-uni-surface border border-uni-border rounded-lg px-2 py-1 outline-none focus:border-uni-gold/60 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.abbr} value={o.abbr} title={o.name}>
            {o.abbr}
          </option>
        ))}
      </select>
    </label>
  );
}
