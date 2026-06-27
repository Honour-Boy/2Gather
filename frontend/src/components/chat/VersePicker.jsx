import { useEffect, useState } from "react";
import { fetchVerses } from "@/lib/verses";

// A composer button that opens a popover of Bible verses. Picking one prefills
// the composer with the verse quoted + attributed, so the user can share it
// (with a note) in a prayer chat. Mirrors PrayerTemplates / the emoji picker.
export default function VersePicker({ onPick, disabled, theme }) {
  const [open, setOpen] = useState(false);
  const [verses, setVerses] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error

  // (Re)load when the popover opens or the active Mode's theme changes.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setStatus("loading");
    fetchVerses({ theme })
      .then((list) => {
        if (!active) return;
        setVerses(list);
        setStatus("ready");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [open, theme]);

  const pick = (v) => {
    onPick?.(`“${v.text}” — ${v.reference} (WEB)`);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((p) => !p)}
        disabled={disabled}
        aria-label="Share a verse"
        aria-expanded={open}
        title="Share a verse"
        className="p-1.5 rounded-full text-uni-muted hover:text-uni-text hover:bg-black/5 transition-colors disabled:opacity-50"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </button>

      {open && (
        <>
          {/* Mobile: a dim backdrop so the popover reads as a bottom sheet; tap
              to dismiss (matches the chat detail-panel backdrop). */}
          <div
            onClick={() => setOpen(false)}
            className="sm:hidden fixed inset-0 z-40 bg-black/40"
          />
          {/* Mobile = full-width bottom sheet (anchored to the viewport so it
              never overflows a narrow screen); sm+ = the original dropdown
              anchored to the button. */}
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:absolute sm:inset-x-auto sm:bottom-12 sm:right-0 sm:z-20 sm:w-72 sm:rounded-2xl sm:pb-2 max-h-[70vh] sm:max-h-80 overflow-y-auto uni-scroll border border-uni-border bg-uni-surface shadow-card p-2">
            <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-uni-gold">
              Share a verse
            </p>

            {status === "loading" && (
              <p className="px-2 py-3 text-sm text-uni-muted">Loading…</p>
            )}
            {status === "error" && (
              <p className="px-2 py-3 text-sm text-uni-muted">Couldn’t load verses.</p>
            )}
            {status === "ready" &&
              verses.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => pick(v)}
                  className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-uni-surface2 transition-colors"
                >
                  <span className="block text-sm font-medium text-uni-text">{v.reference}</span>
                  <span className="block text-xs text-uni-muted line-clamp-2">{v.text}</span>
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
