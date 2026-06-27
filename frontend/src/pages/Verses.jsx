import { useEffect, useState } from "react";
import useUserStore from "@/store/userStore";
import useTranslationStore from "@/store/translationStore";
import { VERSE_THEMES } from "@/lib/modes";
import { fetchVerses, searchVerses as searchVersesApi } from "@/lib/verses";
import VerseOfTheDay from "@/components/verses/VerseOfTheDay";
import VerseFinder from "@/components/verses/VerseFinder";
import TranslationPicker from "@/components/ui/TranslationPicker";
import ShareButton from "@/components/chat/ShareButton";
import { saveVerseToJournal } from "@/services/journal";
import notify from "@/lib/toast";
import Toaster from "@/components/ui/Toaster";

// Browse Scripture: an AI-picked verse of the day, "find verses for what you're
// praying about", AI-curated per-theme sets (refreshed daily), and a search over
// the WHOLE Bible (via API.Bible) — all backed by the server, not a fixed list.
export default function Verses() {
  const { currentUser } = useUserStore();
  const uid = currentUser?.id;
  const { translation } = useTranslationStore();

  const [verses, setVerses] = useState([]);
  const [theme, setTheme] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");

  // Debounce the search query so we don't hammer the Bible API on every keystroke.
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  // Searching the whole Bible when there's a query; otherwise the theme's set.
  const searching = debouncedQ.length > 0;
  useEffect(() => {
    let active = true;
    setLoading(true);
    const req = searching
      ? searchVersesApi(debouncedQ, translation)
      : fetchVerses({ theme: theme === "all" ? undefined : theme, translation });
    req
      .then((list) => active && setVerses(list))
      .catch(() => active && setVerses([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [theme, debouncedQ, searching, translation]);

  const save = async (verse) => {
    if (!uid) return;
    try {
      await saveVerseToJournal(uid, verse);
      notify.success("Saved to your journal.");
    } catch {
      notify.error("Couldn't save. Please try again.");
    }
  };

  const copy = async (verse) => {
    try {
      await navigator.clipboard.writeText(`“${verse.text}” — ${verse.reference} (WEB)`);
      setCopied(verse.id);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      notify.info("Couldn't copy — long-press to copy instead.");
    }
  };

  return (
    <div className="min-h-full px-4 sm:px-6 lg:px-10 py-6 md:py-10">
      <Toaster />
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Verses
          </h1>
          <TranslationPicker className="mt-1.5 shrink-0" />
        </div>
        <p className="mt-2 text-uni-muted">
          Scripture for the moment you&apos;re in — drawn from the whole Bible,
          curated and attributed (World English Bible).
        </p>

        <div className="mt-5">
          <VerseOfTheDay onSave={uid ? save : undefined} />
        </div>

        {/* Describe a prayer request → get matching verses (Phase 8). */}
        <div className="mt-4">
          <VerseFinder />
        </div>

        {/* Search the whole Bible */}
        <div className="mt-6 flex items-center gap-2 bg-uni-surface border border-uni-border rounded-full px-4 py-2.5 focus-within:border-uni-gold/50 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-uni-muted shrink-0">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the whole Bible (word or phrase)"
            aria-label="Search the Bible"
            className="bg-transparent border-none outline-none text-sm text-uni-text placeholder:text-uni-muted w-full"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="Clear search"
              className="text-uni-muted hover:text-uni-text text-sm shrink-0"
            >
              ✕
            </button>
          )}
        </div>

        {/* Theme filters (hidden while searching) */}
        {!searching && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill active={theme === "all"} onClick={() => setTheme("all")}>
              For you
            </Pill>
            {VERSE_THEMES.map((t) => (
              <Pill key={t.id} active={theme === t.id} onClick={() => setTheme(t.id)}>
                {t.label}
              </Pill>
            ))}
          </div>
        )}

        {/* Verse list */}
        <div className="mt-4 space-y-3 pb-6">
          {loading ? (
            <p className="text-sm text-uni-muted text-center py-10">
              {searching ? "Searching the whole Bible…" : "Gathering verses…"}
            </p>
          ) : verses.length === 0 ? (
            <p className="text-sm text-uni-muted text-center py-10">
              {searching
                ? "No verses match that search. Try another word or phrase."
                : "No verses to show right now."}
            </p>
          ) : (
            verses.map((v) => (
              <figure
                key={v.id}
                className="rounded-2xl border border-uni-border bg-uni-surface p-4"
              >
                <blockquote className="text-sm leading-relaxed text-uni-text">
                  “{v.text}”
                </blockquote>
                <figcaption className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-uni-muted">
                    — {v.reference} <span className="opacity-60">({v.translation || "WEB"})</span>
                  </span>
                  <span className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => copy(v)}
                      className="text-xs font-semibold text-uni-muted hover:text-uni-text transition-colors"
                    >
                      {copied === v.id ? "Copied!" : "Copy"}
                    </button>
                    <ShareButton
                      text={`“${v.text}” — ${v.reference} (${v.translation || "WEB"})`}
                      kind="prayer"
                      currentUser={currentUser}
                      preview={v.text}
                      label="Send this verse to a chat"
                    />
                    {uid && (
                      <button
                        onClick={() => save(v)}
                        className="text-xs font-semibold text-uni-gold hover:underline"
                      >
                        Save
                      </button>
                    )}
                  </span>
                </figcaption>
              </figure>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const Pill = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
      active
        ? "bg-brand text-uni-on-accent"
        : "bg-uni-surface border border-uni-border text-uni-muted hover:text-uni-text"
    }`}
  >
    {children}
  </button>
);
