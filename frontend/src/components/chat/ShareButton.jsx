import { useState } from "react";
import RecipientPicker from "@/components/chat/RecipientPicker";
import { forwardChatMessage } from "@/services/messages";
import notify from "@/lib/toast";

// A small icon button that shares a piece of text (a saved verse, prayer, or
// reflection) into one or more of your chats. Opens the shared RecipientPicker
// (multi-select) and writes the text into each selected conversation. Renders
// nothing if there's no signed-in user or no text to send.
//
// If a `note` is provided (a saved entry's private reflection note), tapping the
// button first asks whether to include that note with the entry — "Yes" appends
// it, "No" sends just the entry. Entries without a note skip straight to the
// picker (unchanged behavior).
export default function ShareButton({
  text,
  kind,
  currentUser,
  preview,
  note,
  label = "Send to a chat",
  className = "",
}) {
  const [open, setOpen] = useState(false); // recipient picker
  const [asking, setAsking] = useState(false); // include-note confirm
  const [withNote, setWithNote] = useState(false);

  const uid = currentUser?.id;
  if (!uid || !text) return null;

  const hasNote = !!(note && note.trim());

  // Tap → ask about the note first (if any), else open the picker directly.
  const start = () => {
    if (hasNote) {
      setAsking(true);
    } else {
      setWithNote(false);
      setOpen(true);
    }
  };

  const choose = (include) => {
    setWithNote(include);
    setAsking(false);
    setOpen(true);
  };

  const send = async (chatIds) => {
    const finalText =
      withNote && hasNote ? `${text}\n\nMy reflection: ${note.trim()}` : text;
    try {
      const n = await forwardChatMessage({ chatIds, currentUser, text: finalText, kind });
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
        onClick={start}
        aria-label={label}
        title={label}
        className={`inline-flex items-center justify-center text-uni-muted hover:text-uni-gold transition-colors ${className}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>

      {asking && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setAsking(false)}
        >
          <div
            className="w-full sm:max-w-sm bg-uni-surface border border-uni-border rounded-t-3xl sm:rounded-3xl shadow-card animate-fade-in-up pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <h2 className="text-base font-semibold text-uni-text">
                Include your reflection note?
              </h2>
              <p className="mt-1 text-sm text-uni-muted leading-relaxed">
                Would you like to send your private reflection note along with this entry?
              </p>
              <p className="mt-3 text-xs text-uni-text rounded-xl bg-uni-bg/60 border border-uni-border px-3 py-2 line-clamp-3">
                {note}
              </p>
              <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => choose(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-uni-text bg-uni-surface border border-uni-border hover:border-uni-gold/50 transition-colors"
                >
                  No, just the entry
                </button>
                <button
                  type="button"
                  onClick={() => choose(true)}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-uni-on-accent bg-brand shadow-bubble hover:shadow-glow transition-all"
                >
                  Yes, include it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {open && (
        <RecipientPicker
          uid={uid}
          title="Send to…"
          preview={
            withNote && hasNote
              ? `${preview || text}\n\nMy reflection: ${note.trim()}`
              : preview || text
          }
          sendLabel="Send"
          onSend={send}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
