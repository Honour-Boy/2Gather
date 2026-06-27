import { useState } from "react";
import { format } from "timeago.js";
import useLongPress from "@/hooks/useLongPress";
import RecipientPicker from "@/components/chat/RecipientPicker";
import {
  editChatMessage,
  deleteChatMessage,
  forwardChatMessage,
} from "@/services/messages";
import notify from "@/lib/toast";

// A single chat message bubble. The text, an optional "Prayer" tag, a timestamp
// and an "edited" marker. All actions (copy, forward, save-to-journal, and — for
// your own messages — edit / delete) live in a context menu opened by right-click
// (PC) or long-press (mobile), plus a hover ⋯ on desktop, so the bubble stays
// clean. Deleted messages show a tombstone. Sent messages use the warm gold
// bubble; received use a light card.
const MessageBubble = ({ message, isMine, onSave, chatId, currentUser }) => {
  const [saved, setSaved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text || "");
  const [busy, setBusy] = useState(false);
  const [forwarding, setForwarding] = useState(false);

  const isPrayer = message.kind === "prayer";
  const isDeleted = message.deleted === true;
  const isEdited = !!message.editedAt && !isDeleted;

  const openMenu = () => {
    if (!isDeleted && !editing) setMenuOpen(true);
  };
  const longPress = useLongPress(openMenu);

  const doCopy = async () => {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(message.text || "");
      notify.success("Copied.");
    } catch {
      notify.info("Couldn’t copy — long-press the text to copy instead.");
    }
  };

  const doSave = () => {
    setMenuOpen(false);
    onSave?.(message.text);
    setSaved(true);
  };

  const startEdit = () => {
    setDraft(message.text || "");
    setEditing(true);
    setMenuOpen(false);
  };

  const saveEdit = async () => {
    const text = draft.trim();
    if (!text || busy) {
      if (!text) setEditing(false);
      return;
    }
    if (text === message.text) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await editChatMessage({ chatId, messageId: message.id, text });
      setEditing(false);
    } catch {
      notify.error("Couldn’t edit the message. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setMenuOpen(false);
    if (busy) return;
    setBusy(true);
    try {
      await deleteChatMessage({ chatId, messageId: message.id });
    } catch {
      notify.error("Couldn’t delete the message. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleForward = async (chatIds) => {
    try {
      const n = await forwardChatMessage({
        chatIds,
        currentUser,
        text: message.text,
        kind: message.kind,
      });
      setForwarding(false);
      notify.success(n > 1 ? `Forwarded to ${n} chats.` : "Forwarded.");
    } catch {
      notify.error("Couldn’t forward. Please try again.");
    }
  };

  const actions = [{ label: "Copy", onClick: doCopy }];
  if (!isDeleted) {
    actions.push({ label: "Forward", onClick: () => { setMenuOpen(false); setForwarding(true); } });
    if (isPrayer && onSave) {
      actions.push({ label: saved ? "Saved ✓" : "Save to journal", onClick: doSave, disabled: saved });
    }
    if (isMine) {
      actions.push({ label: "Edit", onClick: startEdit });
      actions.push({ label: "Delete", onClick: doDelete, danger: true });
    }
  }

  return (
    <div
      className={`flex w-full ${
        isMine ? "justify-end animate-slide-in-right" : "justify-start animate-slide-in-left"
      }`}
    >
      <div
        className={`relative flex flex-col max-w-[85%] sm:max-w-[70%] md:max-w-[60%] ${
          isMine ? "items-end" : "items-start"
        }`}
      >
        {isPrayer && !isDeleted && (
          <span className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-uni-gold">
            <span className="w-1.5 h-1.5 rounded-full bg-uni-gold" />
            Prayer
          </span>
        )}

        {editing ? (
          <div className="w-[min(20rem,80vw)] rounded-2xl border border-uni-border bg-uni-surface p-2">
            <textarea
              autoFocus
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full bg-transparent outline-none resize-none uni-scroll text-sm text-uni-text leading-relaxed"
            />
            <div className="mt-1 flex justify-end gap-2">
              <button
                onClick={() => setEditing(false)}
                className="px-2.5 py-1 text-xs font-semibold text-uni-muted hover:text-uni-text"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={busy}
                className="px-3 py-1 text-xs font-bold text-uni-on-accent rounded-lg bg-brand shadow-bubble disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className={`group flex items-center gap-1 ${isMine ? "flex-row-reverse" : ""}`}>
            <div
              onContextMenu={(e) => {
                if (isDeleted) return;
                e.preventDefault();
                setMenuOpen(true);
              }}
              {...longPress}
              className={`px-4 py-2.5 rounded-2xl text-sm md:text-[15px] leading-relaxed break-words ${
                isDeleted
                  ? "bg-uni-surface text-uni-muted italic border border-uni-border rounded-bl-md"
                  : isMine
                    ? "bg-bubble-sent text-uni-on-accent font-medium shadow-bubble rounded-br-md"
                    : "bg-uni-surface text-uni-text rounded-bl-md border border-uni-border"
              }${isPrayer && !isDeleted ? " ring-1 ring-uni-gold/30" : ""}`}
            >
              {isDeleted ? (
                <p className="text-left">This message was deleted</p>
              ) : (
                <p className="whitespace-pre-wrap text-left">{message.text}</p>
              )}
            </div>

            {/* Desktop discoverability: a ⋯ that appears on hover (mobile uses
                long-press, so nothing persistent there). */}
            {!isDeleted && (
              <button
                type="button"
                onClick={openMenu}
                aria-label="Message actions"
                className="hidden sm:flex shrink-0 w-7 h-7 items-center justify-center rounded-full text-uni-muted opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-black/5 transition-opacity"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="1.6" />
                  <circle cx="12" cy="12" r="1.6" />
                  <circle cx="19" cy="12" r="1.6" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div
          className={`mt-0.5 flex items-center gap-2 ${isMine ? "flex-row-reverse" : ""}`}
        >
          <span className="text-[10px] text-uni-muted">
            {message.createdAt?.toDate ? format(message.createdAt.toDate()) : ""}
          </span>
          {isEdited && <span className="text-[10px] text-uni-muted italic">edited</span>}
        </div>

        {/* Action menu — bottom sheet on mobile, dropdown on desktop. */}
        {menuOpen && (
          <>
            <div
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 sm:bg-transparent"
            />
            <div
              className={`fixed inset-x-0 bottom-0 z-50 rounded-t-2xl pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:mt-1 sm:w-44 sm:rounded-xl sm:pb-1.5 border border-uni-border bg-uni-surface shadow-card p-1.5 ${
                isMine ? "sm:right-0" : "sm:left-0"
              }`}
            >
              {actions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={a.onClick}
                  disabled={a.disabled}
                  className={`w-full text-left px-3 py-2.5 sm:py-2 rounded-xl text-sm transition-colors disabled:opacity-50 ${
                    a.danger
                      ? "text-red-600 hover:bg-red-500/10"
                      : "text-uni-text hover:bg-uni-surface2"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </>
        )}

        {forwarding && (
          <RecipientPicker
            uid={currentUser?.id}
            title="Forward to…"
            preview={message.text}
            sendLabel="Forward"
            onSend={handleForward}
            onClose={() => setForwarding(false)}
          />
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
