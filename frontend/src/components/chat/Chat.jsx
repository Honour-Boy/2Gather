import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import useChatStore from "@/store/chatStore";
import useUserStore from "@/store/userStore";
import EmojiPicker from "emoji-picker-react";
import languages from "@/components/common/Languages";
import { isUserOnline } from "@/hooks/usePresence";
import { sendChatMessage } from "@/services/messages";
import MessageBubble from "@/components/chat/MessageBubble";
import { SendIcon, EmojiIcon, Arrow } from "@/components/ui/icons";
import Avatar from "@/components/ui/Avatar";

// How many messages to load initially and per "load older" click.
const PAGE_SIZE = 25;

const Chat = ({ onHeaderClick, detailOpen }) => {
  const [messages, setMessages] = useState([]);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [liveUser, setLiveUser] = useState(null);
  const [liveCurrentUser, setLiveCurrentUser] = useState(null);
  const [text, setText] = useState("");
  const [sendError, setSendError] = useState(null);
  const [openEmoji, setOpenEmoji] = useState(false);
  const [expandedOriginals, setExpandedOriginals] = useState({});

  const { currentUser } = useUserStore();
  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked, resetChat } =
    useChatStore();
  const { t } = useTranslation();
  const endRef = useRef(null);
  const lastMsgIdRef = useRef(null);

  // Auto-scroll to the newest message — but only when a new message actually
  // arrives (newest id changes), so loading older history doesn't yank the
  // view to the bottom.
  useEffect(() => {
    if (!messages.length) return;
    const newestId = messages[messages.length - 1].id;
    if (lastMsgIdRef.current !== newestId) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      lastMsgIdRef.current = newestId;
    }
  }, [messages]);

  // Reset the page window when switching chats.
  useEffect(() => {
    setPageSize(PAGE_SIZE);
    setHasMore(false);
    lastMsgIdRef.current = null;
  }, [chatId]);

  // Messages live in the chats/{chatId}/messages subcollection. We subscribe to
  // the most recent `pageSize` (orderBy desc + limit) and render them ascending,
  // so a long history isn't re-downloaded in full on every snapshot. "Load
  // older" grows the window. (Replaces the old single growing array.)
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );
    const unSub = onSnapshot(q, (snap) => {
      setHasMore(snap.size === pageSize);
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse());
    });
    return () => unSub();
  }, [chatId, pageSize]);

  const loadOlder = () => setPageSize((n) => n + PAGE_SIZE);

  // Subscribe to recipient for dynamic presence — and a live language, so when
  // the other user changes their language the indicator + translate target
  // follow it (the chatStore `user` is a stale snapshot taken at changeChat).
  useEffect(() => {
    if (!user?.id) return;
    const unsub = onSnapshot(doc(db, "users", user.id), (snap) => {
      if (snap.exists()) setLiveUser({ ...snap.data(), id: user.id });
    });
    return () => unsub();
  }, [user?.id]);

  // Subscribe to the current user too: their stored `currentUser` (userStore) is
  // a one-time getDoc, so without this a change to their own language wouldn't
  // update the source indicator or the language messages are sent in.
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.id), (snap) => {
      if (snap.exists())
        setLiveCurrentUser({ ...snap.data(), id: currentUser.id });
    });
    return () => unsub();
  }, [currentUser?.id]);

  // Re-render periodically so "lastSeen" staleness updates without new writes
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const online = isUserOnline(liveUser);

  // Prefer the live docs (which track language changes in real time) and fall
  // back to the store snapshots until the first snapshot lands.
  const effectiveCurrentUser = liveCurrentUser || currentUser;
  const effectiveReceiver = liveUser || user;

  const currentUserLang = languages.find(
    (lang) => lang.value === effectiveCurrentUser?.language
  );
  const userLang = languages.find(
    (lang) => lang.value === effectiveReceiver?.language
  );

  const sourceCode = currentUserLang?.value?.toUpperCase() || "EN";
  const targetCode = userLang?.value?.toUpperCase() || "EN";
  const targetLabel = userLang?.label || "English";
  const sourceLabel = currentUserLang?.label || "English";

  // Resolve a message's stored source language (the *sender's* language) to a
  // human label so the "translated from …" label is correct regardless of who
  // is viewing. Falls back to the viewer-derived label for legacy messages that
  // predate the stored sourceLang field.
  const labelForLang = (code) =>
    languages.find((l) => l.value === code)?.label;

  // Fire-and-forget: the message persists first and shows up via the live
  // subcollection snapshot, so we don't block the UI on the network. Translation
  // patches in afterward (best-effort). Only a genuine persist failure surfaces
  // (the retry affordance below).
  const doSend = async (messageText) => {
    if (!messageText || !chatId) return;
    setSendError(null);
    try {
      await sendChatMessage({
        chatId,
        currentUser,
        receiver: user,
        text: messageText,
        sourceLang: currentUserLang?.value || "en",
        targetLang: userLang?.value || "en",
      });
    } catch (err) {
      console.log(err);
      setSendError(messageText);
    }
  };

  const handleSend = () => {
    const t = text.trim();
    if (!t) return;
    setText(""); // clear immediately for a real-time feel
    doSend(t);
  };

  const handleRetry = () => {
    if (sendError) doSend(sendError);
  };

  const handleEmoji = (e) => {
    if (!isReceiverBlocked) setText((prev) => prev + e.emoji);
  };

  const toggleOriginal = (key) => {
    setExpandedOriginals((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const disabled = isCurrentUserBlocked || isReceiverBlocked;

  return (
    <div className="chat-container">
      {/* Top navigation bar */}
      <div className="flex items-center justify-between gap-2 md:gap-3 px-3 md:px-6 py-3 border-b border-uni-border bg-uni-bg/80 backdrop-blur">
        {/* Back to chat list — mobile only (the sidebar is hidden once a chat
            is open). Clears the selected chat via the store. */}
        <button
          onClick={resetChat}
          className="md:hidden flex items-center justify-center w-10 h-10 -ml-1 rounded-lg text-uni-muted hover:text-white hover:bg-uni-surface transition-colors shrink-0"
          aria-label={t("chat.backToList")}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={onHeaderClick}
          className="flex items-center gap-2.5 md:gap-3 min-w-0 flex-1 rounded-lg p-1 -m-1 hover:bg-uni-surface/60 transition-colors text-left"
          aria-expanded={detailOpen}
          aria-label="Open profile"
        >
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-uni-muted uppercase">
            <span className="w-2 h-2 rounded-full bg-brand" />
            Unicomm
          </span>
          <span className="hidden sm:block w-px h-5 bg-uni-border" />
          <Avatar
            user={effectiveReceiver}
            className="!w-10 !h-10 text-sm"
            fallback="?"
          />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-sm md:text-base font-semibold text-white truncate">
              {user?.fullName || t("chat.selectChat")}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-uni-muted">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  online ? "bg-uni-online animate-pulse-dot" : "bg-uni-muted/50"
                }`}
              />
              {online ? t("common.online") : t("common.offline")}
            </span>
          </div>
        </button>
        <button
          onClick={onHeaderClick}
          className="flex items-center justify-center w-10 h-10 shrink-0 rounded-lg text-uni-muted hover:text-white hover:bg-uni-surface transition-colors"
          title={detailOpen ? t("chat.closeProfile") : t("chat.viewProfile")}
          aria-label={t("chat.viewProfile")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto uni-scroll px-3 md:px-8 py-4 md:py-6 space-y-3">
        {messages.length === 0 && (
          <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-brand-soft border border-uni-lime/20 flex items-center justify-center mb-4 text-3xl">
              🌍
            </div>
            <p className="text-lg font-semibold text-white">
              {t("chat.emptyTitle")}
            </p>
            <p className="text-sm text-uni-muted mt-1 max-w-xs">
              {t("chat.emptyBody", {
                source: sourceLabel,
                name: user?.fullName?.split(" ")[0] || t("chat.yourContact"),
                target: targetLabel,
              })}
            </p>
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center pb-1">
            <button
              onClick={loadOlder}
              className="text-xs font-medium text-uni-muted hover:text-white bg-uni-surface border border-uni-border rounded-full px-4 py-1.5 transition-colors"
            >
              {t("chat.loadOlder")}
            </button>
          </div>
        )}

        {messages.map((message) => {
          const key = message.id;
          return (
            <MessageBubble
              key={key}
              message={message}
              isMine={message.senderId === currentUser?.id}
              showOriginal={!!expandedOriginals[key]}
              targetLabel={targetLabel}
              sourceLabel={labelForLang(message.sourceLang) || sourceLabel}
              onToggleOriginal={() => toggleOriginal(key)}
            />
          );
        })}

        {/* Error state with retry (only on a genuine send/persist failure) */}
        {sendError && (
          <div className="flex justify-end animate-fade-in-up">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              <span>{t("chat.sendFailed")}</span>
              <button
                onClick={handleRetry}
                className="font-semibold text-white bg-red-500/80 hover:bg-red-500 px-2.5 py-1 rounded-md transition-colors"
              >
                {t("chat.retry")}
              </button>
            </div>
          </div>
        )}

        <div ref={endRef}></div>
      </div>

      {/* Input bar */}
      <div className="border-t border-uni-border bg-uni-bg px-3 md:px-6 py-3 md:py-4">
        <div className="flex items-center gap-2 md:gap-3">
          {/* Language indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full bg-uni-surface border border-uni-border text-[11px] font-semibold text-uni-muted">
            <span className="text-white">{sourceCode}</span>
            <Arrow />
            <span className="text-uni-cyan">{targetCode}</span>
          </div>

          <div className="flex-1 flex items-center gap-2 bg-uni-surface border border-uni-border rounded-full pl-4 pr-2 py-1.5 focus-within:border-uni-lime/50 focus-within:shadow-[0_0_0_3px_rgba(198,255,61,0.15)] transition-all">
            <input
              type="text"
              placeholder={
                disabled ? t("chat.cannotSend") : t("chat.messagePlaceholder")
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={disabled}
              className="flex-1 bg-transparent border-none outline-none text-sm md:text-[15px] text-white placeholder:text-uni-muted disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            {/* Emoji picker is desktop-only — phones have a native keyboard
                emoji button, and the picker overlay is cramped on small screens. */}
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => !isReceiverBlocked && setOpenEmoji((p) => !p)}
                className="p-1.5 rounded-full text-uni-muted hover:text-white hover:bg-white/5 transition-colors"
                aria-label={t("chat.emoji")}
              >
                <EmojiIcon />
              </button>
              {openEmoji && (
                <span className="absolute bottom-12 right-0 z-20">
                  <EmojiPicker
                    theme="dark"
                    open={openEmoji}
                    onEmojiClick={handleEmoji}
                  />
                </span>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={disabled || !text.trim()}
              className="flex items-center justify-center w-10 h-10 shrink-0 rounded-full bg-brand text-uni-on-accent shadow-bubble hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              aria-label={t("chat.send")}
            >
              <SendIcon />
            </button>
          </div>
        </div>

        {/* Mobile language indicator */}
        <div className="sm:hidden mt-2 flex justify-center">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-uni-surface border border-uni-border text-[10px] font-semibold text-uni-muted">
            <span className="text-white">{sourceCode}</span>
            <Arrow />
            <span className="text-uni-cyan">{targetCode}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
