import { useEffect, useMemo, useState } from "react";
import useUserStore from "@/store/userStore";
import { VERSE_THEMES } from "@/lib/modes";
import { fetchVerses } from "@/lib/verses";
import VerseOfTheDay from "@/components/verses/VerseOfTheDay";
import { saveVerseToJournal } from "@/services/journal";
import notify from "@/lib/toast";
import Toaster from "@/components/ui/Toaster";

// Browse the verse engine: verse of the day, theme filters, and a search over the
// curated WEB dataset. Save any verse to your journal or copy it to share.
export default function Verses() {
  const { currentUser } = useUserStore();
  const uid = currentUser?.id;

  const [verses, setVerses] = useState([]);
  const [theme, setTheme] = useState("all");
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    let active = true;
    fetchVerses({})
      .then((list) => active && setVerses(list))
      .catch(() => active && setVerses([]));
    return () => {
      active = false;
    };
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return verses.filter((v) => {
      const inTheme = theme === "all" || (v.themes || []).includes(theme);
      const inSearch =
        !needle ||
        v.text.toLowerCase().includes(needle) ||
        v.reference.toLowerCase().includes(needle);
      return inTheme && inSearch;
    });
  }, [verses, theme, q]);

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
    <div className="min-h-full px-4 sm:px-6 lg:px-10 py-6 md:py-10">
      <Toaster />
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          Verses
        </h1>
        <p className="mt-2 text-uni-muted">
          Scripture for the moment you&apos;re in — curated and attributed (World
          English Bible).
        </p>

        <div className="mt-5">
          <VerseOfTheDay onSave={uid ? save : undefined} />
        </div>

        {/* Search */}
        <div className="mt-6 flex items-center gap-2 bg-uni-surface border border-uni-border rounded-full px-4 py-2.5 focus-within:border-uni-gold/50 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-uni-muted shrink-0">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search verses (word or reference)"
            aria-label="Search verses"
            className="bg-transparent border-none outline-none text-sm text-uni-text placeholder:text-uni-muted w-full"
          />
        </div>

        {/* Theme filters */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill active={theme === "all"} onClick={() => setTheme("all")}>
            All
          </Pill>
          {VERSE_THEMES.map((t) => (
            <Pill key={t.id} active={theme === t.id} onClick={() => setTheme(t.id)}>
              {t.label}
            </Pill>
          ))}
        </div>

        {/* Verse list */}
        <div className="mt-4 space-y-3 pb-6">
          {shown.length === 0 && (
            <p className="text-sm text-uni-muted text-center py-10">
              No verses match. Try another word or theme.
            </p>
          )}
          {shown.map((v) => (
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
                      className="text-xs font-semibold text-uni-gold hover:underline"
                    >
                      Save
                    </button>
                  )}
                </span>
              </figcaption>
            </figure>
          ))}
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
