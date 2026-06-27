import useModeStore from "@/store/modeStore";
import { MODES, BRAND_ACCENT } from "@/lib/modes";

// A compact row of Mode pills. Selecting a Mode re-scopes the verse + prayer
// content (via the active-mode store) to that Mode's theme, and the selected
// pill is filled with that Mode's accent (brand gold for "General").
export default function ModeSwitcher({ className = "" }) {
  const { activeMode, setMode, clearMode } = useModeStore();

  const pill = (selected) =>
    `px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
      selected
        ? "text-uni-on-accent shadow-bubble"
        : "bg-uni-surface border border-uni-border text-uni-muted hover:text-uni-text hover:border-uni-gold/40"
    }`;

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={clearMode}
        aria-pressed={!activeMode}
        className={pill(!activeMode)}
        style={!activeMode ? { backgroundColor: BRAND_ACCENT } : undefined}
      >
        General
      </button>
      {MODES.map((m) => {
        const selected = activeMode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            aria-pressed={selected}
            title={m.description}
            className={pill(selected)}
            style={selected ? { backgroundColor: m.accent } : undefined}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
