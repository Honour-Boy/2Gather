import { useState } from "react";
import useUserStore from "@/store/userStore";
import useModeStore from "@/store/modeStore";
import { themeForMode } from "@/lib/modes";
import { recommendVerses } from "@/lib/verseRecommend";
import { saveVerseToJournal } from "@/services/journal";
import notify from "@/lib/toast";
import Spinner from "@/components/ui/Spinner";

// "Find verses for what you're praying about" — the user describes their request
// in their own words and gets 1–3 real, attributed verses to lean on (save to
// journal or copy to share). The app never writes the prayer; it only surfaces
// Scripture. Verses come grounded from the backend corpus.
export default function VerseFinder({ className = "" }) {
  const { currentUser } = useUserStore();
  const uid = currentUser?.id;
  const { activeMode } = useModeStore();

  const [request, setRequest] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { verses, support, source }
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [savedIds, setSavedIds] = useState(() => new Set());

  const submit = async (e) => {
    e.preventDefault();
    const text = request.trim();
    if (!text || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await recommendVerses({
        request: text,
        theme: themeForMode(activeMode),
      });
      setResult(data);
    } catch {
      setError("Couldn't find verses right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const save = async (verse) => {
    if (!uid) return;
    try {
      await saveVerseToJournal(uid, { ...verse, mode: activeMode || null });
      setSavedIds((prev) => new Set(prev).add(verse.id));
      notify.success("Saved to your journal.");
    } catch {
      notify.error("Couldn't save. Please try again.");
    }
  };

  const copy = async (verse) => {
    try {
      await navigator.clipboard.writeText(
        `“${verse.text}” — ${verse.reference} (WEB)`
      );
      setCopied(verse.id);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      notify.info("Couldn't copy — long-press to copy instead.");
    }
  };

  return (
    <section
      className={`rounded-2xl border border-uni-border bg-brand-soft p-4 sm:p-5 ${className}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-widest text-uni-gold">
        Find verses for your prayer
      </span>
      <h2 className="mt-1 font-display text-lg font-semibold text-uni-text">
        What are you praying about?
      </h2>

      <form onSubmit={submit} className="mt-3">
        <label htmlFor="verse-finder" className="sr-only">
          Describe what you&apos;re praying about
        </label>
        <textarea
          id="verse-finder"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="e.g. I have an interview tomorrow and I'm anxious"
          className="w-full resize-none rounded-xl bg-uni-surface border border-uni-border text-uni-text text-sm px-4 py-2.5 placeholder:text-uni-muted outline-none focus:border-uni-gold/70 focus:shadow-[0_0_0_3px_rgba(221,162,58,0.18)] transition-all"
        />
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <p className="text-[11px] text-uni-muted leading-snug">
            Scripture is always quoted in full and attributed — we just help you
            find it.
          </p>
          <button
            type="submit"
            disabled={loading || !request.trim()}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-uni-on-accent rounded-xl bg-brand shadow-bubble hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? <Spinner /> : "Find verses"}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {result?.support && (
        <p
          className="mt-4 rounded-xl border border-uni-blue/30 bg-uni-blue/10 p-3 text-sm text-uni-text leading-relaxed"
          role="alert"
        >
          {result.support}
        </p>
      )}

      {result?.verses?.length > 0 && (
        <div className="mt-4 space-y-3">
          {result.verses.map((v) => (
            <figure
              key={v.id}
              className="rounded-2xl border border-uni-border bg-uni-surface p-4"
            >
              <blockquote className="text-sm leading-relaxed text-uni-text">
                “{v.text}”
              </blockquote>
              <figcaption className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-uni-muted">
                  — {v.reference} <span className="opacity-60">(WEB)</span>
                </span>
                <span className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => copy(v)}
                    className="text-xs font-semibold text-uni-muted hover:text-uni-text transition-colors"
                  >
                    {copied === v.id ? "Copied!" : "Copy"}
                  </button>
                  {uid && (
                    <button
                      onClick={() => save(v)}
                      disabled={savedIds.has(v.id)}
                      className="text-xs font-semibold text-uni-gold hover:underline disabled:opacity-60 disabled:no-underline"
                    >
                      {savedIds.has(v.id) ? "Saved ✓" : "Save"}
                    </button>
                  )}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
