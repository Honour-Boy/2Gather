import { useEffect, useState } from "react";
import { fetchPrayerTemplates } from "@/lib/prayerTemplates";

// A composer button that opens a popover of curated prayer templates. Picking
// one calls onPick(body) so the chat composer can prefill an editable prayer.
// Mirrors the emoji-picker pattern in Chat.jsx. Loads lazily on first open.
export default function PrayerTemplates({ onPick, disabled, theme }) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error

  // (Re)load when the popover opens or the active Mode's theme changes.
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

  const pick = (body) => {
    onPick?.(body);
    setOpen(false);
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
        className="p-1.5 rounded-full text-uni-muted hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v6" />
          <path d="M12 8c-2 0-4 1.5-4 4v8h8v-8c0-2.5-2-4-4-4z" />
          <path d="M9 2h6" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-12 right-0 z-20 w-72 max-h-80 overflow-y-auto uni-scroll rounded-2xl border border-uni-border bg-uni-surface shadow-2xl p-2">
          <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-uni-lime">
            Prayer templates
          </p>

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
              <button
                key={tpl.id}
                type="button"
                onClick={() => pick(tpl.body)}
                className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-uni-surface2 transition-colors"
              >
                <span className="block text-sm font-medium text-white">
                  {tpl.title}
                </span>
                <span className="block text-xs text-uni-muted line-clamp-2">
                  {tpl.body}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
