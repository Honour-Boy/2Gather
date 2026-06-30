import { useCallback, useEffect, useState } from "react";
import { fetchVerses } from "@/lib/verses";
import PopoverPanel from "@/components/ui/PopoverPanel";
import useExclusivePopup from "@/hooks/useExclusivePopup";

// A composer button that opens a compact, centered panel of Bible verses. Picking
// one prefills the composer with the verse quoted + attributed, so the user can
// share it (with a note) in a prayer chat. Mirrors PrayerTemplates.
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

  const close = useCallback(() => setOpen(false), []);
  const claim = useExclusivePopup(open, close); // single active popup

  const pick = (v) => {
    onPick?.(`“${v.text}” — ${v.reference} (WEB)`);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen((p) => {
            if (!p) claim();
            return !p;
          });
        }}
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
        <PopoverPanel title="Share a verse" onClose={close}>
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
        </PopoverPanel>
      )}
    </div>
  );
}
