import { useEffect, useState } from "react";
import { fetchDailyVerse } from "@/lib/verses";
import useTranslationStore from "@/store/translationStore";

// An ambient "verse of the day" card. Fails quietly (renders nothing) if the
// backend is unreachable — it's a grace note, never a blocker. Optionally scope
// to a theme (e.g. the user's active Mode in a later phase).
export default function VerseOfTheDay({ theme, onSave, className = "" }) {
  const { translation } = useTranslationStore();
  const [verse, setVerse] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    fetchDailyVerse({ theme, translation })
      .then((v) => {
        if (!active) return;
        setVerse(v);
        setStatus(v ? "ready" : "error");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [theme, translation]);

  if (status === "error") return null;

  return (
    <div
      className={`rounded-2xl border border-uni-border bg-uni-surface/60 p-5 text-left ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-uni-gold animate-pulse-dot" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-uni-gold">
            Verse of the day
          </span>
        </span>
        {onSave && status === "ready" && (
          <button
            onClick={() => {
              onSave(verse);
              setSaved(true);
            }}
            disabled={saved}
            className="text-[11px] font-semibold text-uni-gold hover:underline disabled:opacity-60 disabled:no-underline"
          >
            {saved ? "Saved ✓" : "Save"}
          </button>
        )}
      </div>

      {status === "loading" ? (
        <div className="space-y-2 animate-pulse" aria-hidden="true">
          <div className="h-3 rounded bg-uni-border/60 w-full" />
          <div className="h-3 rounded bg-uni-border/60 w-5/6" />
          <div className="h-3 rounded bg-uni-border/40 w-1/3 mt-3" />
        </div>
      ) : (
        <figure>
          <blockquote className="text-sm leading-relaxed text-uni-text">
            “{verse.text}”
          </blockquote>
          <figcaption className="mt-3 text-xs font-medium text-uni-muted">
            — {verse.reference} <span className="opacity-60">({verse.translation || "WEB"})</span>
          </figcaption>
        </figure>
      )}
    </div>
  );
}
