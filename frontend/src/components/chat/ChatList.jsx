import { useEffect, useState } from "react";
import useUserStore from "@/store/userStore";
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  collection,
  query,
  getDocs,
  serverTimestamp,
  where,
  limit,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import useChatStore from "@/store/chatStore";
import { syncUserchats } from "@/services/userchats";
import { searchIcon } from "@/assets";
import { format } from "timeago.js";
import notify from "@/lib/toast";
import Toaster from "@/components/ui/Toaster";
import Avatar from "@/components/ui/Avatar";
import { displayName } from "@/lib/displayName";

const ChatList = () => {
  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [input, setInput] = useState(""); // filters the conversation list
  const [toastify, setToast] = useState();
  const { currentUser } = useUserStore();
  const { changeChat } = useChatStore();
  const [isAdding, setIsAdding] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // "Add people" modal state.
  const [addOpen, setAddOpen] = useState(false);
  const [term, setTerm] = useState(""); // people search inside the modal
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (!currentUser?.id) return;

    // The chat index is one doc per conversation under
    // userchats/{uid}/items/{chatId}, maintained server-side by the backend.
    const itemsQuery = query(
      collection(db, "userchats", currentUser.id, "items"),
      orderBy("updatedAt", "desc")
    );

    const unSub = onSnapshot(
      itemsQuery,
      async (snap) => {
        const items = snap.docs.map((d) => d.data());
        const chatData = await Promise.all(
          items.map(async (item) => {
            const userSnap = await getDoc(doc(db, "users", item.receiverId));
            return { ...item, user: { ...userSnap.data(), id: item.receiverId } };
          })
        );
        setChats(chatData);
        setLoadingChats(false);
      },
      (err) => {
        console.log(err);
        setLoadingChats(false);
      }
    );

    return () => unSub();
  }, [currentUser?.id]);

  useEffect(() => {
    if (toastify) notify.info(toastify);
  }, [toastify]);

  // A few people you could start praying with (shown in the Add-people modal).
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const snap = await getDocs(query(collection(db, "users"), limit(6)));
        const list = snap.docs
          .map((d) => ({ ...d.data(), id: d.id }))
          .filter(
            (s) =>
              s.id !== currentUser?.id &&
              !chats.some((chat) => chat.user?.id === s.id)
          );
        setSuggestions(list);
      } catch (err) {
        console.log(err);
      }
    };
    if (currentUser?.id) fetchSuggestions();
  }, [currentUser?.id, chats]);

  // If someone opened an invite link (…/?add=@handle), open the modal and
  // pre-fill the search so connecting is one tap.
  useEffect(() => {
    const add = new URLSearchParams(window.location.search).get("add");
    if (add) {
      setAddOpen(true);
      setTerm(add);
    }
  }, []);

  // Forgiving people search: prefix-match on @handle (case-insensitive-ish),
  // excluding yourself and people already in your chat list. Debounced.
  useEffect(() => {
    const raw = term.trim().replace(/^@+/, "").toLowerCase();
    if (!raw) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = "@" + raw;
    const id = setTimeout(async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "users"),
            where("username", ">=", handle),
            where("username", "<=", handle + ""),
            limit(10)
          )
        );
        const list = snap.docs
          .map((d) => ({ ...d.data(), id: d.id }))
          .filter(
            (u) =>
              u.id !== currentUser?.id &&
              !chats.some((chat) => chat.user?.id === u.id)
          );
        setResults(list);
      } catch (err) {
        console.log(err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [term, currentUser?.id, chats]);

  const handleAdd = async (userToAdd) => {
    if (!userToAdd || !currentUser || isAdding) return;
    if (userToAdd.id === currentUser.id) {
      setToast("That's you!");
      return;
    }
    setIsAdding(true);
    try {
      const existing = await getDocs(
        query(
          collection(db, "userchats", currentUser.id, "items"),
          where("receiverId", "==", userToAdd.id),
          limit(1)
        )
      );
      if (!existing.empty) {
        setToast("You're already connected.");
        changeChat(existing.docs[0].data().chatId, userToAdd);
        setAddOpen(false);
        return;
      }

      // Create the chat doc; the backend seeds both users' index entries on sync.
      const chatRef = doc(collection(db, "chats"));
      await setDoc(chatRef, {
        createdAt: serverTimestamp(),
        participantIds: [currentUser.id, userToAdd.id],
      });
      await syncUserchats(chatRef.id);

      notify.success(`Connected with ${userToAdd.username || "them"}.`);
      setTerm("");
      setResults([]);
      setAddOpen(false);
    } catch (err) {
      console.log(err);
      notify.error("Couldn't connect. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleSelect = (chatId, userInfo) => changeChat(chatId, userInfo);

  const copy = async (text, which) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      setToast("Couldn't copy — long-press to copy instead.");
    }
  };

  const inviteHandle = currentUser?.username || "";
  const inviteLink = `${window.location.origin}/?add=${encodeURIComponent(
    inviteHandle
  )}`;

  const filteredChats = chats.filter((c) => {
    const q = input.toLowerCase();
    return (
      displayName(c.user, "").toLowerCase().includes(q) ||
      (c.user?.username || "").toLowerCase().includes(q)
    );
  });

  const truncateMessage = (message, wordLimit = 4) => {
    const words = (message || "").split(" ");
    return words.length > wordLimit
      ? words.slice(0, wordLimit).join(" ") + " ..."
      : message;
  };

  return (
    <div className="flex-1 overflow-y-auto items-start flex flex-col w-full px-3 py-3 gap-1 uni-scroll">
      <Toaster />

      {/* Search conversations + add people */}
      <div className="flex items-center gap-2 w-full">
        <div className="flex items-center gap-2 flex-1 bg-uni-surface border border-uni-border rounded-full px-3 py-2 focus-within:border-uni-gold/50 transition-colors">
          <img src={searchIcon} alt="" className="w-4 h-4 opacity-60 shrink-0" />
          <input
            type="text"
            placeholder="Search conversations"
            aria-label="Search conversations"
            value={input}
            className="bg-transparent border-none outline-none text-sm text-uni-text placeholder:text-uni-muted w-full flex-1"
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="Add people"
          title="Add people"
          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-brand text-uni-on-accent shadow-bubble hover:shadow-glow transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>

      <h3 className="mt-4 text-xs font-semibold text-uni-muted uppercase tracking-wider px-1 self-start">
        Chats
      </h3>
      {loadingChats ? (
        <div className="w-full flex flex-col gap-0.5 mt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex w-full items-center gap-3 p-2.5 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-uni-surface2 animate-pulse shrink-0" />
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="h-3 w-28 bg-uni-surface2 animate-pulse rounded" />
                <div className="h-2.5 w-40 bg-uni-surface2 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : chats.length === 0 ? (
        <div className="text-center w-full py-8 px-4">
          <p className="text-uni-muted text-sm">
            No conversations yet. Tap{" "}
            <span className="font-semibold text-uni-text">＋</span> to find someone
            to pray with.
          </p>
          <button
            onClick={() => setAddOpen(true)}
            className="mt-3 px-4 py-2 text-sm font-bold text-uni-on-accent rounded-xl bg-brand shadow-bubble hover:shadow-glow transition-all"
          >
            Add people
          </button>
        </div>
      ) : filteredChats.length === 0 ? (
        <p className="text-uni-muted text-sm text-center w-full py-6">
          No conversations match your search.
        </p>
      ) : null}

      <div className="w-full flex flex-col gap-0.5 mt-1">
        {filteredChats.map((chat) => (
          <div
            key={chat.chatId}
            className="flex w-full items-center gap-3 p-2.5 cursor-pointer rounded-xl hover:bg-uni-surface transition-colors"
            onClick={() => handleSelect(chat.chatId, chat.user)}
          >
            <Avatar user={chat.user} small className="text-sm" />
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <div className="flex justify-between items-center gap-2">
                <span className="font-medium text-left text-uni-text text-sm truncate">
                  {displayName(chat.user)}
                </span>
                <span className="text-[10px] text-uni-muted shrink-0">
                  {chat.lastUpdated?.toDate ? format(chat.lastUpdated.toDate()) : ""}
                </span>
              </div>
              <p className="text-xs text-left text-uni-muted truncate">
                {chat.user?.blocked?.includes(currentUser?.id)
                  ? "Blocked"
                  : truncateMessage(
                      chat.lastTranslatedMessage || chat.lastMessage || ""
                    )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {addOpen && (
        <AddPeopleModal
          onClose={() => setAddOpen(false)}
          term={term}
          setTerm={setTerm}
          searching={searching}
          results={results}
          suggestions={suggestions}
          onAdd={handleAdd}
          isAdding={isAdding}
          inviteHandle={inviteHandle}
          inviteLink={inviteLink}
          copied={copied}
          onCopy={copy}
        />
      )}
    </div>
  );
};

const PersonRow = ({ person, onAdd, isAdding }) => (
  <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-uni-surface2 transition-colors">
    <div className="flex items-center gap-3 min-w-0">
      <Avatar user={person} small className="text-sm" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-uni-text truncate">
          {person.fullName || person.username}
        </p>
        <p className="text-xs text-uni-muted truncate">{person.username}</p>
      </div>
    </div>
    <button
      type="button"
      onClick={() => onAdd(person)}
      disabled={isAdding}
      className="shrink-0 px-3 py-1.5 text-xs font-bold rounded-full bg-brand text-uni-on-accent shadow-bubble hover:shadow-glow disabled:opacity-50 transition-all"
    >
      Connect
    </button>
  </div>
);

const AddPeopleModal = ({
  onClose,
  term,
  setTerm,
  searching,
  results,
  suggestions,
  onAdd,
  isAdding,
  inviteHandle,
  inviteLink,
  copied,
  onCopy,
}) => (
  <div
    className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
    onClick={onClose}
  >
    <div
      className="w-full sm:max-w-md bg-uni-surface border border-uni-border rounded-t-3xl sm:rounded-3xl shadow-card max-h-[85vh] overflow-y-auto uni-scroll animate-fade-in-up"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-uni-border sticky top-0 bg-uni-surface">
        <h2 className="text-base font-semibold text-uni-text">Add people</h2>
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

      <div className="p-5 space-y-5">
        {/* Search */}
        <div>
          <label className="block text-xs font-semibold text-uni-muted uppercase tracking-wider mb-1.5">
            Find someone
          </label>
          <div className="flex items-center gap-2 bg-uni-bg border border-uni-border rounded-xl px-3 py-2.5 focus-within:border-uni-gold/50 transition-colors">
            <span className="text-uni-muted text-sm">@</span>
            <input
              autoFocus
              type="text"
              value={term.replace(/^@+/, "")}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="their username"
              aria-label="Search by username"
              className="bg-transparent border-none outline-none text-sm text-uni-text placeholder:text-uni-muted w-full"
            />
          </div>

          <div className="mt-2 flex flex-col gap-0.5 min-h-[1rem]">
            {searching && (
              <p className="text-xs text-uni-muted px-1 py-2">Searching…</p>
            )}
            {!searching && term.trim() && results.length === 0 && (
              <p className="text-xs text-uni-muted px-1 py-2">
                No one found for “{term.replace(/^@+/, "")}”. Check the spelling, or
                share your invite link below.
              </p>
            )}
            {results.map((p) => (
              <PersonRow key={p.id} person={p} onAdd={onAdd} isAdding={isAdding} />
            ))}
          </div>
        </div>

        {/* Suggestions */}
        {!term.trim() && suggestions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-uni-muted uppercase tracking-wider mb-1.5">
              People you can pray with
            </p>
            <div className="flex flex-col gap-0.5">
              {suggestions.map((p) => (
                <PersonRow key={p.id} person={p} onAdd={onAdd} isAdding={isAdding} />
              ))}
            </div>
          </div>
        )}

        {/* Invite */}
        <div className="rounded-2xl bg-brand-soft border border-uni-gold/20 p-4">
          <p className="text-sm font-semibold text-uni-text">Invite a friend</p>
          <p className="text-xs text-uni-muted mt-0.5">
            Share your handle or link so they can connect with you.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => onCopy(inviteHandle, "handle")}
              disabled={!inviteHandle}
              className="px-3 py-1.5 text-xs font-semibold rounded-full bg-uni-surface border border-uni-border text-uni-text hover:border-uni-gold/50 transition-colors disabled:opacity-50"
            >
              {copied === "handle" ? "Copied!" : `Copy ${inviteHandle || "handle"}`}
            </button>
            <button
              onClick={() => onCopy(inviteLink, "link")}
              className="px-3 py-1.5 text-xs font-semibold rounded-full bg-uni-surface border border-uni-border text-uni-text hover:border-uni-gold/50 transition-colors"
            >
              {copied === "link" ? "Copied!" : "Copy invite link"}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default ChatList;
