import { useState } from "react";
import { format } from "timeago.js";

// A single chat message bubble: the text, an optional "Prayer" tag, a timestamp,
// and (for prayers) a Save-to-journal action. Sent messages use the warm gold
// bubble; received use a light card.
const MessageBubble = ({ message, isMine, onSave }) => {
  const [saved, setSaved] = useState(false);
  const isPrayer = message.kind === "prayer";

  return (
    <div
      className={`flex w-full ${
        isMine ? "justify-end animate-slide-in-right" : "justify-start animate-slide-in-left"
      }`}
    >
      <div
        className={`flex flex-col max-w-[85%] sm:max-w-[70%] md:max-w-[60%] ${
          isMine ? "items-end" : "items-start"
        }`}
      >
        {isPrayer && (
          <span className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-uni-gold">
            <span className="w-1.5 h-1.5 rounded-full bg-uni-gold" />
            Prayer
          </span>
        )}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm md:text-[15px] leading-relaxed break-words ${
            isMine
              ? "bg-bubble-sent text-uni-on-accent font-medium shadow-bubble rounded-br-md"
              : "bg-uni-surface text-uni-text rounded-bl-md border border-uni-border"
          }${isPrayer ? " ring-1 ring-uni-gold/30" : ""}`}
        >
          <p className="whitespace-pre-wrap text-left">{message.text}</p>
        </div>

        <div
          className={`mt-0.5 flex items-center gap-2 ${
            isMine ? "flex-row-reverse" : ""
          }`}
        >
          <span className="text-[10px] text-uni-muted">
            {message.createdAt?.toDate ? format(message.createdAt.toDate()) : ""}
          </span>
          {isPrayer && onSave && (
            <button
              onClick={() => {
                onSave(message.text);
                setSaved(true);
              }}
              disabled={saved}
              className="text-[10px] font-medium text-uni-gold hover:underline disabled:opacity-60 disabled:no-underline"
            >
              {saved ? "Saved ✓" : "Save to journal"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
