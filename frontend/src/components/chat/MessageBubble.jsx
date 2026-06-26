import { format } from "timeago.js";

// A single chat message bubble: the text, an optional "Prayer" tag, and a
// timestamp. Sent messages use the warm gold bubble; received use a light card.
const MessageBubble = ({ message, isMine }) => {
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
        {message.kind === "prayer" && (
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
          }${message.kind === "prayer" ? " ring-1 ring-uni-gold/30" : ""}`}
        >
          <p className="whitespace-pre-wrap text-left">{message.text}</p>
        </div>

        <span
          className={`text-[10px] text-uni-muted mt-0.5 ${
            isMine ? "text-right" : "text-left"
          }`}
        >
          {message.createdAt?.toDate ? format(message.createdAt.toDate()) : ""}
        </span>
      </div>
    </div>
  );
};

export default MessageBubble;
