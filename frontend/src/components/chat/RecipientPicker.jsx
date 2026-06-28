import { useEffect, useState } from "react";
import { fetchUserChats } from "@/services/chats";
import Avatar from "@/components/ui/Avatar";

// Reusable "Send to…" modal: pick one or more of your conversations and confirm.
// Used to forward a chat message and to share a journal entry / verse. The caller
// passes `onSend(chatIds)` (does the actual sending + toast) and an optional
// `preview` of what's being sent. Bottom sheet on mobile, centered card on
// desktop — matches the Add-people modal.
export default function RecipientPicker({
  uid,
  title = "Send to…",
  preview,
  sendLabel = "Send",
  onSend,
  onClose,
}) {
  const [chats, setChats] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [selected, setSelected] = useState(() => new Set());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    fetchUserChats(uid)
      .then((list) => {
        if (!active) return;
        setChats(list);
        setStatus("ready");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [uid]);

  const toggle = (chatId) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(chatId) ? next.delete(chatId) : next.add(chatId);
      return next;
    });

  const send = async () => {
    if (!selected.size || sending) return;
    setSending(true);
    try {
      await onSend([...selected]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-uni-surface border border-uni-border rounded-t-3xl sm:rounded-3xl shadow-card max-h-[85vh] flex flex-col animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-uni-border">
          <h2 className="text-base font-semibold text-uni-text">{title}</h2>
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

        {preview && (
          <div className="px-5 pt-4">
            <p className="text-xs text-uni-muted line-clamp-3 rounded-xl bg-uni-bg/60 border border-uni-border px-3 py-2">
              {preview}
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto uni-scroll px-3 py-3">
          {status === "loading" && (
            <p className="px-2 py-6 text-sm text-uni-muted text-center">
              Loading your conversations…
            </p>
          )}
          {status === "error" && (
            <p className="px-2 py-6 text-sm text-uni-muted text-center">
              Couldn’t load your conversations.
            </p>
          )}
          {status === "ready" && chats.length === 0 && (
            <p className="px-2 py-6 text-sm text-uni-muted text-center">
              No conversations yet. Add someone to pray with first.
            </p>
          )}
          {status === "ready" &&
            chats.map(({ chatId, user }) => {
              const on = selected.has(chatId);
              return (
                <button
                  key={chatId}
                  type="button"
                  onClick={() => toggle(chatId)}
                  aria-pressed={on}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${
                    on ? "bg-brand-soft" : "hover:bg-uni-surface2"
                  }`}
                >
                  <Avatar user={user} small className="text-sm" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-uni-text truncate">
                      {user?.fullName || user?.username || "Someone"}
                    </span>
                    {user?.username && (
                      <span className="block text-xs text-uni-muted truncate">
                        {user.username}
                      </span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center ${
                      on
                        ? "bg-brand border-transparent text-uni-on-accent"
                        : "border-uni-border"
                    }`}
                    aria-hidden="true"
                  >
                    {on && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
        </div>

        <div className="px-5 py-4 border-t border-uni-border pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={send}
            disabled={!selected.size || sending}
            className="w-full py-2.5 rounded-xl text-sm font-bold bg-brand text-uni-on-accent shadow-bubble hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {sending
              ? "Sending…"
              : selected.size
                ? `${sendLabel} (${selected.size})`
                : sendLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
