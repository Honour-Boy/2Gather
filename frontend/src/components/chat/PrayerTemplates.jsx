import { useEffect, useState } from "react";
import { fetchPrayerTemplates, generatePrayer } from "@/lib/prayerTemplates";
import { subscribeCustomTemplates } from "@/services/customTemplates";
import useUserStore from "@/store/userStore";

// A composer button that opens a popover of prayer templates. Picking one calls
// onPick(body) so the chat composer can prefill an editable prayer. Sources, in
// order: an opt-in AI "generate a prayer" flow (only when the user has enabled it
// in settings), the user's own custom templates, then the curated set. Bottom
// sheet on mobile, dropdown on desktop. Loads lazily on first open.
export default function PrayerTemplates({ onPick, disabled, theme }) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [custom, setCustom] = useState([]);

  // AI generate flow state.
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null); // { prayer, verse, source, support }
  const [genError, setGenError] = useState(false);

  const { currentUser } = useUserStore();
  const uid = currentUser?.id;
  const aiEnabled = !!currentUser?.aiPrayerTemplates;

  // (Re)load curated templates when the popover opens or the Mode's theme changes.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setStatus("loading");
    fetchPrayerTemplates({ theme })
      .then((list) => {
        if (!active) return;
        setTemplates(list);
        setStatus("ready");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [open, theme]);

  // Live-subscribe to the user's custom templates while open.
  useEffect(() => {
    if (!open || !uid) return;
    const unsub = subscribeCustomTemplates(uid, setCustom);
    return () => unsub();
  }, [open, uid]);

  const close = () => {
    setOpen(false);
    setGenerated(null);
    setGenError(false);
  };

  const pick = (body) => {
    onPick?.(body);
    close();
  };

  const verseLine = (v) =>
    `“${v.text}” — ${v.reference} (${v.translation || "WEB"})`;

  const generate = async () => {
    setGenerating(true);
    setGenError(false);
    setGenerated(null);
    try {
      const result = await generatePrayer({ theme, hasVerse: false });
      setGenerated(result);
    } catch {
      setGenError(true);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((p) => !p)}
        disabled={disabled}
        aria-label="Prayer templates"
        aria-expanded={open}
        title="Prayer templates"
        className="p-1.5 rounded-full text-uni-muted hover:text-uni-text hover:bg-black/5 transition-colors disabled:opacity-50"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v6" />
          <path d="M12 8c-2 0-4 1.5-4 4v8h8v-8c0-2.5-2-4-4-4z" />
          <path d="M9 2h6" />
        </svg>
      </button>

      {open && (
        <>
          <div onClick={close} className="sm:hidden fixed inset-0 z-40 bg-black/40" />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:absolute sm:inset-x-auto sm:bottom-12 sm:right-0 sm:z-20 sm:w-80 sm:rounded-2xl sm:pb-2 max-h-[70vh] sm:max-h-96 overflow-y-auto uni-scroll border border-uni-border bg-uni-surface shadow-card p-2">
            <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-uni-gold">
              Prayer templates
            </p>

            {/* AI generate (opt-in) */}
            {aiEnabled && (
              <div className="mb-2 px-1">
                {generated ? (
                  <div className="rounded-xl border border-uni-gold/30 bg-brand-soft p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-uni-gold mb-1.5">
                      ✨ AI-assisted — edit before sending
                    </p>
                    {generated.support && (
                      <p className="text-xs text-uni-text mb-2 leading-relaxed">
                        {generated.support}
                      </p>
                    )}
                    <p className="text-sm text-uni-text whitespace-pre-wrap leading-relaxed">
                      {generated.prayer}
                    </p>
                    {generated.verse && (
                      <p className="mt-2 text-xs text-uni-muted leading-relaxed">
                        Suggested verse — {generated.verse.reference}:{" "}
                        “{generated.verse.text}”
                      </p>
                    )}
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => pick(generated.prayer)}
                        className="px-3 py-1.5 text-xs font-bold text-uni-on-accent rounded-lg bg-brand shadow-bubble hover:shadow-glow transition-all"
                      >
                        Use prayer
                      </button>
                      {generated.verse && (
                        <button
                          type="button"
                          onClick={() =>
                            pick(`${generated.prayer}\n\n${verseLine(generated.verse)}`)
                          }
                          className="px-3 py-1.5 text-xs font-semibold text-uni-text rounded-lg bg-uni-surface border border-uni-border hover:border-uni-gold/50 transition-colors"
                        >
                          Use with verse
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={generate}
                        disabled={generating}
                        className="px-3 py-1.5 text-xs font-semibold text-uni-muted hover:text-uni-text"
                      >
                        Regenerate
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={generate}
                    disabled={generating}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl bg-brand-soft border border-uni-gold/30 text-uni-text hover:border-uni-gold/60 disabled:opacity-60 transition-colors"
                  >
                    {generating ? "Writing a prayer…" : "✨ Generate a prayer"}
                  </button>
                )}
                {genError && (
                  <p className="mt-1 px-1 text-xs text-uni-muted">
                    Couldn’t generate right now. Try a template below.
                  </p>
                )}
              </div>
            )}

            {/* Your custom templates */}
            {custom.length > 0 && (
              <>
                <p className="px-2 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-uni-muted">
                  Your templates
                </p>
                {custom.map((tpl) => (
                  <TemplateItem key={tpl.id} tpl={tpl} onClick={() => pick(tpl.body)} />
                ))}
              </>
            )}

            {/* Curated templates */}
            {(custom.length > 0 || aiEnabled) && status === "ready" && (
              <p className="px-2 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-uni-muted">
                Curated
              </p>
            )}
            {status === "loading" && (
              <p className="px-2 py-3 text-sm text-uni-muted">Loading…</p>
            )}
            {status === "error" && (
              <p className="px-2 py-3 text-sm text-uni-muted">
                Couldn’t load templates.
              </p>
            )}
            {status === "ready" &&
              templates.map((tpl) => (
                <TemplateItem key={tpl.id} tpl={tpl} onClick={() => pick(tpl.body)} />
              ))}
          </div>
        </>
      )}
    </div>
  );
}

const TemplateItem = ({ tpl, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-uni-surface2 transition-colors"
  >
    <span className="block text-sm font-medium text-uni-text">{tpl.title}</span>
    <span className="block text-xs text-uni-muted line-clamp-2">{tpl.body}</span>
  </button>
);
