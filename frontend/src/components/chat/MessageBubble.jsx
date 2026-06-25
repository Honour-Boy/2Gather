import { format } from "timeago.js";
import { useTranslation } from "react-i18next";
import { TranslateIcon } from "@/components/ui/icons";

// A single chat message: the bubble, the translation label/toggle, and timestamp.
// The sender sees their original text; the recipient sees the translation, with a
// toggle to reveal the original.
const MessageBubble = ({
  message,
  isMine,
  showOriginal,
  targetLabel,
  sourceLabel,
  onToggleOriginal,
}) => {
  const { t } = useTranslation();
  const hasTranslation =
    message.translatedText && message.translatedText !== message.text;

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
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm md:text-[15px] leading-relaxed break-words ${
            isMine
              ? "bg-bubble-sent text-uni-on-accent font-medium shadow-bubble rounded-br-md"
              : "bg-uni-surface text-uni-text rounded-bl-md border border-uni-border"
          }`}
        >
          {/* translate="no" keeps a browser's page-translation (e.g. a French
              UI) from re-translating message content — so toggling to the
              original shows the recipient's real POV, not a browser render. */}
          <p className="whitespace-pre-wrap text-left" translate="no">
            {isMine
              ? message.text
              : showOriginal
              ? message.text
              : message.translatedText || message.text}
          </p>
        </div>

        {/* Translation label / toggle */}
        {hasTranslation && (
          <div
            className={`mt-1 flex items-center gap-2 text-[11px] ${
              isMine ? "text-uni-cyan/90" : "text-uni-muted"
            }`}
          >
            {isMine ? (
              <span className="flex items-center gap-1">
                <TranslateIcon />
                {t("chat.translatedTo", { lang: targetLabel })}
              </span>
            ) : (
              <button
                onClick={onToggleOriginal}
                className="flex items-center gap-1 hover:text-uni-lime transition-colors"
              >
                <TranslateIcon />
                {showOriginal
                  ? t("chat.showTranslation")
                  : t("chat.translatedFrom", { lang: sourceLabel })}
              </button>
            )}
          </div>
        )}

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
