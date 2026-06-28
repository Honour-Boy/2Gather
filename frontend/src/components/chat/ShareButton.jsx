import { useState } from "react";
import RecipientPicker from "@/components/chat/RecipientPicker";
import { forwardChatMessage } from "@/services/messages";
import notify from "@/lib/toast";

// A small icon button that shares a piece of text (a saved verse, prayer, or
// reflection) into one or more of your chats. Opens the shared RecipientPicker
// (multi-select) and writes the text into each selected conversation. Renders
// nothing if there's no signed-in user or no text to send.
export default function ShareButton({
  text,
  kind,
  currentUser,
  preview,
  label = "Send to a chat",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const uid = currentUser?.id;
  if (!uid || !text) return null;

  const send = async (chatIds) => {
    try {
      const n = await forwardChatMessage({ chatIds, currentUser, text, kind });
      setOpen(false);
      notify.success(n > 1 ? `Sent to ${n} chats.` : "Sent.");
    } catch {
      notify.error("Couldn’t send. Please try again.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
        className={`inline-flex items-center justify-center text-uni-muted hover:text-uni-gold transition-colors ${className}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
      {open && (
        <RecipientPicker
          uid={uid}
          title="Send to…"
          preview={preview || text}
          sendLabel="Send"
          onSend={send}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
