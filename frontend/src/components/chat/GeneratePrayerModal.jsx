import { useRef, useState } from "react";
import { generatePrayer } from "@/lib/prayerTemplates";

// "Generate a prayer" wizard — a compact, centered modal.
//
// Step 1 (form): a REQUIRED scripture/verse the prayer is based on, plus OPTIONAL
// personal points / intentions, and a prominent "Generate Prayer" button.
// Step 2 (result): the AI prose in a fully EDITABLE textarea, with the user's
// scripture quoted at the bottom — so the final text always includes the verse.
//
// Faith rule (CLAUDE.md): the model writes prayer PROSE only; the scripture is
// the user's own input, included verbatim — never quoted/invented by the model.
// AI is disclosed; the wizard is available to everyone, and the first real
// generation fires onConsent() so Settings remembers the choice.
export default function GeneratePrayerModal({ theme, aiEnabled, onPick, onClose, onConsent }) {
  const [scripture, setScripture] = useState("");
  const [intentions, setIntentions] = useState("");
  const [status, setStatus] = useState("form"); // form | loading | result | error
  const [text, setText] = useState("");
  const consented = useRef(false);

  const hasScripture = scripture.trim().length > 0;

  // The model only sees the situation/intentions (+ a scripture mention to steer
  // tone); it never returns the verse text. Bounded to the backend's topic limit.
  const buildTopic = () => {
    const parts = [];
    if (intentions.trim()) parts.push(intentions.trim());
    parts.push(`based on the scripture ${scripture.trim()}`);
    return parts.join(". ").slice(0, 300);
  };

  const generate = async () => {
    if (!hasScripture || status === "loading") return;
    setStatus("loading");
    if (!aiEnabled && !consented.current) {
      consented.current = true;
      onConsent?.(); // best-effort; never blocks generation
    }
    try {
      const res = await generatePrayer({ topic: buildTopic(), theme, hasVerse: true });
      const prayer = (res?.prayer || "").trim();
      // Editable result with the user's scripture quoted at the bottom.
      setText(`${prayer}\n\n“${scripture.trim()}”`);
      setStatus("result");
    } catch {
      setStatus("error");
    }
  };

  const use = () => {
    const t = text.trim();
    if (!t) return;
    onPick?.(t);
    onClose?.();
  };

  const fieldCls =
    "w-full rounded-xl bg-uni-bg/60 border border-uni-border px-3 py-2.5 text-sm text-uni-text placeholder:text-uni-muted outline-none focus:border-uni-gold/60 focus:shadow-[0_0_0_3px_rgba(221,162,58,0.15)] transition-all resize-none";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Generate a prayer"
    >
      <div
        className="w-full max-w-sm max-h-[88vh] overflow-y-auto uni-scroll bg-uni-surface border border-uni-border rounded-3xl shadow-card animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-uni-border">
          <h2 className="text-base font-semibold text-uni-text">Generate a prayer</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 -mr-2 rounded-lg text-uni-muted hover:text-uni-text hover:bg-uni-surface2 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-uni-gold">
            ✨ AI-assisted — you can edit before sending
          </p>

          {status === "result" ? (
            <>
              <label htmlFor="gen-result" className="block text-xs font-semibold text-uni-muted uppercase tracking-wider">
                Your prayer (editable)
              </label>
              <textarea
                id="gen-result"
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                className={fieldCls}
              />
              <p className="text-xs text-uni-muted">
                Your scripture is included at the bottom — edit anything freely.
              </p>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStatus("form")}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-uni-muted hover:text-uni-text transition-colors"
                >
                  Edit details
                </button>
                <button
                  type="button"
                  onClick={generate}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-uni-text bg-uni-surface border border-uni-border hover:border-uni-gold/50 transition-colors"
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={use}
                  disabled={!text.trim()}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-uni-on-accent bg-brand shadow-bubble hover:shadow-glow disabled:opacity-50 transition-all"
                >
                  Use this prayer
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="gen-scripture" className="block text-xs font-semibold text-uni-muted uppercase tracking-wider mb-1.5">
                  Scripture or verse *
                </label>
                <textarea
                  id="gen-scripture"
                  autoFocus
                  value={scripture}
                  onChange={(e) => setScripture(e.target.value)}
                  rows={2}
                  placeholder={'e.g. Philippians 4:6 — “Do not be anxious about anything…”'}
                  className={fieldCls}
                />
              </div>
              <div>
                <label htmlFor="gen-intentions" className="block text-xs font-semibold text-uni-muted uppercase tracking-wider mb-1.5">
                  Anything to include (optional)
                </label>
                <textarea
                  id="gen-intentions"
                  value={intentions}
                  onChange={(e) => setIntentions(e.target.value)}
                  rows={2}
                  placeholder="people, themes, or specific intentions…"
                  className={fieldCls}
                />
              </div>

              {status === "error" && (
                <p className="text-xs text-red-600">
                  Couldn’t generate right now. Please try again.
                </p>
              )}

              <button
                type="button"
                onClick={generate}
                disabled={!hasScripture || status === "loading"}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-uni-on-accent bg-brand shadow-bubble hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {status === "loading" ? "Writing a prayer…" : "Generate Prayer"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
