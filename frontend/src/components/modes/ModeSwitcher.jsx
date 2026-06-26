import useModeStore from "@/store/modeStore";
import { MODES } from "@/lib/modes";

// A compact row of Mode pills. Selecting a Mode re-scopes the verse + prayer
// content (via the active-mode store) to that Mode's theme. "General" clears it.
export default function ModeSwitcher({ className = "" }) {
  const { activeMode, setMode, clearMode } = useModeStore();

  const pill = (selected) =>
    `px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
      selected
        ? "bg-brand text-uni-on-accent shadow-bubble"
        : "bg-uni-surface border border-uni-border text-uni-muted hover:text-uni-text hover:border-uni-lime/40"
    }`;

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      <button type="button" onClick={clearMode} aria-pressed={!activeMode} className={pill(!activeMode)}>
        General
      </button>
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setMode(m.id)}
          aria-pressed={activeMode === m.id}
          title={m.description}
          className={pill(activeMode === m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
