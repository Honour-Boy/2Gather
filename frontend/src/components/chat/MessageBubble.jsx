import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "timeago.js";
import useLongPress from "@/hooks/useLongPress";
import useExclusivePopup from "@/hooks/useExclusivePopup";
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
//
// MOBILE long-press = WhatsApp-style focus: the pressed bubble lifts above a
// dimmed+blurred backdrop (a bright copy at its measured position) and the action
// menu sits directly above or below it (whichever fits) — never over the message.
// DESKTOP keeps the small dropdown anchored to the bubble.
const isMobileViewport = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(max-width: 639px)").matches;

const MessageBubble = ({ message, isMine, onSave, chatId, currentUser }) => {
  const [saved, setSaved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // When set (mobile only), render the focus overlay anchored to this rect.
  const [focusRect, setFocusRect] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text || "");
  const [busy, setBusy] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const bubbleRef = useRef(null);

  const isPrayer = message.kind === "prayer";
  const isDeleted = message.deleted === true;
  const isEdited = !!message.editedAt && !isDeleted;

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setFocusRect(null);
  }, []);
  const claimMenu = useExclusivePopup(menuOpen, closeMenu); // single active popup
  const openMenu = () => {
    if (isDeleted || editing) return;
    // Capture the bubble's position for the mobile focus overlay; desktop uses
    // the anchored dropdown (focusRect stays null).
    setFocusRect(
      isMobileViewport() && bubbleRef.current
        ? bubbleRef.current.getBoundingClientRect()
        : null
    );
    setMenuOpen(true);
    claimMenu();
  };
  const longPress = useLongPress(openMenu);

  // Shared bubble-box styling (compact on mobile) — reused by the inline bubble
  // and its lifted copy in the focus overlay, so they look identical.
  const bubbleBoxCls = `px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-[13px] sm:text-sm md:text-[15px] leading-relaxed break-words ${
    isDeleted
      ? "bg-uni-surface text-uni-muted italic border border-uni-border rounded-bl-md"
      : isMine
        ? "bg-bubble-sent text-uni-on-accent font-medium shadow-bubble rounded-br-md"
        : "bg-uni-surface text-uni-text rounded-bl-md border border-uni-border"
  }${isPrayer && !isDeleted ? " ring-1 ring-uni-gold/30" : ""}`;

  const doCopy = async () => {
    closeMenu();
    try {
      await navigator.clipboard.writeText(message.text || "");
      notify.success("Copied.");
    } catch {
      notify.info("Couldn’t copy — long-press the text to copy instead.");
    }
  };

  const doSave = () => {
    closeMenu();
    onSave?.(message.text);
    setSaved(true);
  };

  const startEdit = () => {
    setDraft(message.text || "");
    setEditing(true);
    closeMenu();
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
    closeMenu();
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
    actions.push({ label: "Forward", onClick: () => { closeMenu(); setForwarding(true); } });
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
              ref={bubbleRef}
              onContextMenu={(e) => {
                if (isDeleted || editing) return;
                e.preventDefault();
                openMenu();
              }}
              {...longPress}
              className={bubbleBoxCls}
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

        {/* Desktop: a small dropdown anchored under the bubble. (Mobile uses the
            focus overlay below.) */}
        {menuOpen && !focusRect && (
          <>
            <div onClick={closeMenu} className="fixed inset-0 z-40" />
            <div
              className={`absolute top-full mt-1 w-44 z-50 rounded-xl border border-uni-border bg-uni-surface shadow-card p-1.5 ${
                isMine ? "right-0" : "left-0"
              }`}
            >
              {actions.map((a) => (
                <ActionMenuButton key={a.label} action={a} />
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

      {/* Mobile: WhatsApp-style focus overlay (portal to body so it escapes any
          scroll/stacking context). The pressed bubble lifts above a dimmed,
          blurred backdrop and the menu sits directly above/below it. */}
      {menuOpen && focusRect &&
        createPortal(
          <MobileFocusMenu
            rect={focusRect}
            isMine={isMine}
            isPrayer={isPrayer}
            bubbleBoxCls={bubbleBoxCls}
            text={message.text}
            actions={actions}
            onClose={closeMenu}
          />,
          document.body
        )}
    </div>
  );
};

// One row in either menu. Compact but keeps a ≥44px touch target on mobile.
const ActionMenuButton = ({ action: a }) => (
  <button
    type="button"
    onClick={a.onClick}
    disabled={a.disabled}
    className={`w-full text-left px-3 py-3 sm:py-2 rounded-xl text-sm transition-colors active:scale-[0.98] disabled:opacity-50 ${
      a.danger ? "text-red-600 hover:bg-red-500/10" : "text-uni-text hover:bg-uni-surface2"
    }`}
  >
    {a.label}
  </button>
);

// The mobile focus overlay. Anchors a bright copy of the pressed bubble to its
// on-screen rect over a dimmed backdrop, and places the action menu directly
// above or below it — whichever side has room — so it never covers the message.
const MobileFocusMenu = ({ rect, isMine, isPrayer, bubbleBoxCls, text, actions, onClose }) => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const GAP = 10;
  const estMenuH = actions.length * 48 + 12;
  // Prefer below; flip above when the bubble sits low enough that the menu
  // wouldn't fit under it.
  const below = rect.bottom + GAP + estMenuH <= vh - 12;

  const horiz = isMine
    ? { right: Math.max(8, vw - rect.right) }
    : { left: Math.max(8, rect.left) };
  const menuStyle = below
    ? { ...horiz, top: rect.bottom + GAP }
    : { ...horiz, top: rect.top - GAP, transform: "translateY(-100%)" };

  return (
    <div className="sm:hidden fixed inset-0 z-[60]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      {/* Lifted, bright copy of the pressed bubble at its measured position. */}
      <div
        className="absolute flex flex-col"
        style={{ top: rect.top, left: rect.left, width: rect.width, alignItems: isMine ? "flex-end" : "flex-start" }}
        onClick={(e) => e.stopPropagation()}
      >
        {isPrayer && (
          <span className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-uni-gold">
            <span className="w-1.5 h-1.5 rounded-full bg-uni-gold" />
            Prayer
          </span>
        )}
        <div className={bubbleBoxCls}>
          <p className="whitespace-pre-wrap text-left">{text}</p>
        </div>
      </div>

      {/* Action menu, anchored to the bubble's side, above or below it. */}
      <div
        className="absolute z-[61] w-52 max-w-[78vw] rounded-2xl border border-uni-border bg-uni-surface shadow-card p-1.5 animate-fade-in-up"
        style={menuStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {actions.map((a) => (
          <ActionMenuButton key={a.label} action={a} />
        ))}
      </div>
    </div>
  );
};

export default MessageBubble;
