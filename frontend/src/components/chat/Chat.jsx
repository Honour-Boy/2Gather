import { useCallback, useEffect, useRef, useState } from "react";
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
import { isUserOnline } from "@/hooks/usePresence";
import { sendChatMessage } from "@/services/messages";
import { savePrayerToJournal } from "@/services/journal";
import notify from "@/lib/toast";
import MessageBubble from "@/components/chat/MessageBubble";
import { SendIcon, EmojiIcon } from "@/components/ui/icons";
import Avatar from "@/components/ui/Avatar";
import PrayerTemplates from "@/components/chat/PrayerTemplates";
import VersePicker from "@/components/chat/VersePicker";
import useModeStore from "@/store/modeStore";
import { themeForMode } from "@/lib/modes";
import useExclusivePopup from "@/hooks/useExclusivePopup";

// How many messages to load initially and per "load older" click.
const PAGE_SIZE = 25;

const Chat = ({ onHeaderClick, detailOpen }) => {
  const [messages, setMessages] = useState([]);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [liveUser, setLiveUser] = useState(null);
  const [text, setText] = useState("");
  const [sendError, setSendError] = useState(null);
  const [sendErrorKind, setSendErrorKind] = useState(null);
  // Tracks when the composer was filled from a prayer template / verse picker,
  // so the sent message is tagged kind: "prayer" (styled in MessageBubble).
  const [pendingKind, setPendingKind] = useState(null);
  const [openEmoji, setOpenEmoji] = useState(false);

  const { currentUser } = useUserStore();
  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked, resetChat } =
    useChatStore();
  const { activeMode } = useModeStore();
  const modeTheme = themeForMode(activeMode);
  const endRef = useRef(null);
  const lastMsgIdRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-grow the composer like WhatsApp: the textarea grows with the wrapped
  // text up to a max height, then scrolls (so long messages stay fully visible
  // while typing). Recomputed whenever the text changes (incl. clearing on send).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    // Cap shorter on phones (~3 lines) than on desktop (~6) so the growing
    // composer doesn't swallow a small screen.
    const maxH = window.innerWidth < 640 ? 80 : 128;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
  }, [text]);

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
  // older" grows the window.
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

  // Subscribe to the recipient's user doc for live presence (the chatStore
  // `user` is a stale snapshot taken at changeChat).
  useEffect(() => {
    if (!user?.id) return;
    const unsub = onSnapshot(doc(db, "users", user.id), (snap) => {
      if (snap.exists()) setLiveUser({ ...snap.data(), id: user.id });
    });
    return () => unsub();
  }, [user?.id]);

  // Re-render periodically so "lastSeen" staleness updates without new writes.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Emoji picker participates in the single-active-popup rule.
  const closeEmoji = useCallback(() => setOpenEmoji(false), []);
  const claimEmoji = useExclusivePopup(openEmoji, closeEmoji);

  const online = isUserOnline(liveUser);
  const effectiveReceiver = liveUser || user;
  const firstName = user?.fullName?.split(" ")[0] || "your friend";

  // Fire-and-forget: the message persists first and shows up via the live
  // subcollection snapshot, so we don't block the UI on the network. Only a
  // genuine persist failure surfaces (the retry affordance below).
  const doSend = async (messageText, kind) => {
    if (!messageText || !chatId) return;
    setSendError(null);
    try {
      await sendChatMessage({ chatId, currentUser, text: messageText, kind });
    } catch (err) {
      console.log(err);
      setSendError(messageText);
      setSendErrorKind(kind || null);
    }
  };

  const handleSend = () => {
    const t = text.trim();
    if (!t) return;
    const kind = pendingKind;
    setText(""); // clear immediately for a real-time feel
    setPendingKind(null);
    doSend(t, kind);
  };

  const handleRetry = () => {
    if (sendError) doSend(sendError, sendErrorKind);
  };

  const handleEmoji = (e) => {
    if (!isReceiverBlocked) setText((prev) => prev + e.emoji);
  };

  const handleSavePrayer = async (prayerText) => {
    if (!currentUser?.id) return;
    try {
      await savePrayerToJournal(currentUser.id, prayerText, activeMode || null);
      notify.success("Saved to your journal.");
    } catch {
      notify.error("Couldn't save. Please try again.");
    }
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
          className="md:hidden flex items-center justify-center w-10 h-10 -ml-1 rounded-lg text-uni-muted hover:text-uni-text hover:bg-uni-surface transition-colors shrink-0"
          aria-label={"Back to chats"}
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
            2Gather
          </span>
          <span className="hidden sm:block w-px h-5 bg-uni-border" />
          <Avatar
            user={effectiveReceiver}
            className="!w-10 !h-10 text-sm"
            fallback="?"
          />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-sm md:text-base font-semibold text-uni-text truncate">
              {user?.fullName || "Select a chat"}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-uni-muted">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  online ? "bg-uni-online animate-pulse-dot" : "bg-uni-muted/50"
                }`}
              />
              {online ? "Online" : "Offline"}
            </span>
          </div>
        </button>
        <button
          onClick={onHeaderClick}
          className="flex items-center justify-center w-10 h-10 shrink-0 rounded-lg text-uni-muted hover:text-uni-text hover:bg-uni-surface transition-colors"
          title={detailOpen ? "Close profile" : "View profile"}
          aria-label={"View profile"}
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
            <div className="w-16 h-16 rounded-2xl bg-brand-soft border border-uni-gold/20 flex items-center justify-center mb-4 text-3xl">
              🙏
            </div>
            <p className="text-lg font-semibold text-uni-text">
              Start praying together
            </p>
            <p className="text-sm text-uni-muted mt-1 max-w-xs">
              Send a message, share a verse, or open with a prayer for{" "}
              {firstName}.
            </p>
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center pb-1">
            <button
              onClick={loadOlder}
              className="text-xs font-medium text-uni-muted hover:text-uni-text bg-uni-surface border border-uni-border rounded-full px-4 py-1.5 transition-colors"
            >
              Load older messages
            </button>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isMine={message.senderId === currentUser?.id}
            onSave={handleSavePrayer}
            chatId={chatId}
            currentUser={currentUser}
          />
        ))}

        {/* Error state with retry (only on a genuine send/persist failure) */}
        {sendError && (
          <div className="flex justify-end animate-fade-in-up">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs">
              <span>Couldn&apos;t send your message.</span>
              <button
                onClick={handleRetry}
                className="font-semibold text-white bg-red-500/90 hover:bg-red-500 px-2.5 py-1 rounded-md transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div ref={endRef}></div>
      </div>

      {/* Input bar */}
      <div className="border-t border-uni-border bg-uni-bg px-3 md:px-6 py-3 md:py-4">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex-1 flex items-end gap-2 bg-uni-surface border border-uni-border rounded-3xl pl-4 pr-2 py-1.5 focus-within:border-uni-gold/50 focus-within:shadow-[0_0_0_3px_rgba(221,162,58,0.15)] transition-all">
            <textarea
              ref={inputRef}
              rows={1}
              placeholder={
                disabled ? "You cannot send a message" : "Type your message…"
              }
              aria-label={"Type your message…"}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (e.target.value === "") setPendingKind(null);
              }}
              disabled={disabled}
              className="flex-1 bg-transparent border-none outline-none resize-none uni-scroll text-sm md:text-[15px] leading-relaxed text-uni-text placeholder:text-uni-muted disabled:opacity-50 py-1.5"
              onKeyDown={(e) => {
                // Enter sends; Shift+Enter inserts a newline.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            {/* Share a real Bible verse — prefills the composer (attributed). */}
            <VersePicker
              onPick={(snippet) => {
                setText((prev) => (prev.trim() ? `${prev.trim()} ${snippet}` : snippet));
                setPendingKind("prayer");
              }}
              disabled={disabled}
              theme={modeTheme}
            />

            {/* Prayer templates — prefill the composer with an editable starter
                prayer. Available on all screen sizes. */}
            <PrayerTemplates
              onPick={(body) => {
                setText((prev) => (prev.trim() ? `${prev.trim()} ${body}` : body));
                setPendingKind("prayer");
              }}
              disabled={disabled}
              theme={modeTheme}
            />

            {/* Emoji picker is desktop-only — phones have a native keyboard
                emoji button, and the picker overlay is cramped on small screens. */}
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => {
                  if (isReceiverBlocked) return;
                  setOpenEmoji((p) => {
                    if (!p) claimEmoji();
                    return !p;
                  });
                }}
                className="p-1.5 rounded-full text-uni-muted hover:text-uni-text hover:bg-black/5 transition-colors"
                aria-label={"Emoji"}
              >
                <EmojiIcon />
              </button>
              {openEmoji && (
                <span className="absolute bottom-12 right-0 z-20">
                  <EmojiPicker
                    theme="light"
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
              aria-label={"Send"}
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
