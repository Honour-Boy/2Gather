import { useCallback, useEffect, useState } from "react";
import { fetchPrayerTemplates } from "@/lib/prayerTemplates";
import { subscribeCustomTemplates } from "@/services/customTemplates";
import useUserStore from "@/store/userStore";
import GeneratePrayerModal from "@/components/chat/GeneratePrayerModal";
import PopoverPanel from "@/components/ui/PopoverPanel";
import useExclusivePopup from "@/hooks/useExclusivePopup";
import { enableAiPrayerTemplates } from "@/services/aiPrefs";

// A composer button that opens a compact, centered panel of prayer templates.
// Picking one calls onPick(body) so the chat composer can prefill an editable
// prayer. Sources, in order: a "Generate a prayer" wizard (AI-assisted, available
// to everyone), the user's own custom templates, then the curated set. Loads
// lazily on first open.
export default function PrayerTemplates({ onPick, disabled, theme }) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [custom, setCustom] = useState([]);
  const [genOpen, setGenOpen] = useState(false);

  const { currentUser, fetchUserInfo } = useUserStore();
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

  const close = useCallback(() => setOpen(false), []);
  const claim = useExclusivePopup(open, close); // single active popup

  const pick = (body) => {
    onPick?.(body);
    close();
  };

  // First real generation persists AI consent so Settings remembers it.
  const handleConsent = () => {
    if (!uid) return;
    Promise.resolve(enableAiPrayerTemplates(uid))
      .then(() => fetchUserInfo?.(uid))
      .catch(() => {});
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
        <PopoverPanel title="Prayer templates" onClose={close}>
          {/* Generate a prayer (AI-assisted; available to everyone, disclosed). */}
          <div className="mb-2 px-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false); // single active popup: close the picker first
                setGenOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl bg-brand-soft border border-uni-gold/30 text-uni-text hover:border-uni-gold/60 transition-colors"
            >
              ✨ Generate a prayer
            </button>
          </div>

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
          {status === "ready" && templates.length > 0 && (
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
        </PopoverPanel>
      )}

      {genOpen && (
        <GeneratePrayerModal
          theme={theme}
          aiEnabled={aiEnabled}
          onPick={(t) => {
            onPick?.(t);
            setGenOpen(false);
          }}
          onClose={() => setGenOpen(false)}
          onConsent={handleConsent}
        />
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
