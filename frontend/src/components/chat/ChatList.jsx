import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { searchIcon, plusIcon } from "@/assets";
import { format } from "timeago.js";
import notify from "@/lib/toast";
import Toaster from "@/components/ui/Toaster";
import LoadingSpinner from "@/components/common/LoadingComponent";
import Avatar from "@/components/ui/Avatar";

const ChatList = () => {
  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [input, setInput] = useState("");
  const [toastify, setToast] = useState();
  const { currentUser } = useUserStore();
  const { changeChat } = useChatStore();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const { t } = useTranslation();

  useEffect(() => {
    if (!currentUser?.id) return;

    // The chat index is one doc per conversation under
    // userchats/{uid}/items/{chatId}, maintained server-side by the backend.
    // It already carries the last message + sender + time, so we just resolve
    // the partner's profile (no per-chat message query). Ordered most-recent
    // first by the backend-maintained `updatedAt`.
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
            return {
              ...item,
              user: { ...userSnap.data(), id: item.receiverId },
            };
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

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const userRef = collection(db, "users");
        const q = query(userRef, limit(5));
        const querySnapShot = await getDocs(q);

        const suggestionList = querySnapShot.docs
          .map((doc) => ({
            ...doc.data(),
            id: doc.id,
          }))
          .filter(
            (suggestion) =>
              suggestion.id !== currentUser?.id &&
              !chats.some((chat) => chat.user?.id === suggestion.id) // Exclude users already in chat list
          );

        setSuggestions(suggestionList);
      } catch (err) {
        console.log(err);
      }
    };

    if (currentUser) fetchSuggestions();
  }, [currentUser?.id, chats]);

  const handleSearch = async () => {
    let username = input.trim();

    // Prepend "@" if not already present
    if (!username.startsWith("@")) {
      username = "@" + username;
    }

    setUser(null);
    setIsLoading(true);

    try {
      const userRef = collection(db, "users");
      const q = query(userRef, where("username", "==", username));
      const querySnapShot = await getDocs(q);

      if (!querySnapShot.empty) {
        setIsLoading(false);
        setUser({
          ...querySnapShot.docs[0].data(),
          id: querySnapShot.docs[0].id,
        });
      } else {
        setUser(null);
        setIsLoading(null);
        setError(t("chatList.userNotFound"));
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleAdd = async (userToAdd) => {
    if (!userToAdd || !currentUser || isAdding) return;

    // Check if the user is trying to add themselves
    if (userToAdd.id === currentUser.id) {
      setToast(t("chatList.cannotAddSelf"));
      return;
    }
    setIsAdding(true);
    setToast(t("chatList.addingUser"));
    try {
      // Prevent duplicates: is there already an index entry for this partner?
      // (The index is owner-readable; this is a read, not a write.)
      const existing = await getDocs(
        query(
          collection(db, "userchats", currentUser.id, "items"),
          where("receiverId", "==", userToAdd.id),
          limit(1)
        )
      );
      if (!existing.empty) {
        setToast(t("chatList.alreadyInList"));
        setIsAdding(false);
        return;
      }

      // Create the chat document only. participantIds drives the Firestore
      // security rules (only these two users can read/write this chat). The
      // client no longer writes userchats — the backend seeds both users' index
      // entries when we sync below (it's owner-only / server-only).
      const chatRef = doc(collection(db, "chats"));
      await setDoc(chatRef, {
        createdAt: serverTimestamp(),
        participantIds: [currentUser.id, userToAdd.id],
      });
      await syncUserchats(chatRef.id);

      setToast(t("chatList.userAdded"));
      setUser(null); // Reset the user state after adding
    } catch (err) {
      console.log(err); // Log any errors
    } finally {
      setIsAdding(false); // Reset loading state
    }
  };

  const handleSelect = (chatId, userInfo) => {
    changeChat(chatId, userInfo);
  };

  const filteredChats = chats.filter((c) =>
    c.user?.username?.toLowerCase().includes(input.toLowerCase())
  );

  const truncateMessage = (message, wordLimit = 4) => {
    const words = message.split(" ");
    if (words.length > wordLimit) {
      return words.slice(0, wordLimit).join(" ") + " ...";
    }
    return message;
  };

  return (
    <div className="flex-1 overflow-y-auto items-start flex flex-col w-full px-3 py-3 gap-1 uni-scroll">
      <Toaster />
      <div className="flex items-center gap-2 w-full">
        <div className="flex items-center gap-2 flex-1 bg-uni-surface border border-uni-border rounded-full px-3 py-2 focus-within:border-uni-lime/50 transition-colors">
          <img
            src={searchIcon}
            alt="search"
            className="w-4 h-4 cursor-pointer opacity-70"
            onClick={handleSearch}
          />
          <input
            type="text"
            placeholder={t("chatList.searchPlaceholder")}
            className="bg-transparent border-none outline-none text-sm text-white placeholder:text-uni-muted w-full flex-1"
            onChange={(e) => {
              setInput(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={handleSearch}
          />
        </div>
      </div>
      {isLoading === true && input !== "" && (
        <div className="mt-3">
          <LoadingSpinner />
        </div>
      )}
      {!user && isLoading === null && (
        <div className="mt-3 text-left">{error}</div>
      )}
      {user && (
        <div className="mt-3 flex items-center justify-between gap-3 bg-uni-surface border border-uni-border p-3 rounded-xl w-full">
          <span className="text-white text-sm">{user.username}</span>
          <img
            src={plusIcon}
            alt="add user"
            className="w-5 h-5 cursor-pointer opacity-80 hover:opacity-100"
            onClick={() => handleAdd(user)}
          />
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="mt-4 w-full flex flex-col">
          <h3 className="text-xs font-semibold text-uni-muted text-left uppercase tracking-wider px-1">
            {t("chatList.suggestions")}
          </h3>
          <div className="w-full mt-2 overflow-x-auto scrollbar-hide">
            <div className="w-max flex flex-row gap-2 pb-1">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleAdd(suggestion)}
                  className="flex items-center gap-2 bg-uni-surface border border-uni-border hover:border-uni-lime/40 px-3 py-2 rounded-full transition-colors"
                >
                  <span className="text-white text-xs">
                    {suggestion.username}
                  </span>
                  <img
                    src={plusIcon}
                    alt="add user"
                    className="w-4 h-4 cursor-pointer opacity-80"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <h3 className="mt-4 text-xs font-semibold text-uni-muted uppercase tracking-wider px-1 self-start">
        {t("chatList.chats")}
      </h3>
      {loadingChats ? (
        <div className="w-full flex flex-col gap-0.5 mt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex w-full items-center gap-3 p-2.5 rounded-xl"
            >
              <div className="w-10 h-10 rounded-full bg-uni-surface2 animate-pulse shrink-0" />
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="h-3 w-28 bg-uni-surface2 animate-pulse rounded" />
                <div className="h-2.5 w-40 bg-uni-surface2 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : chats.length === 0 ? (
        <p className="text-uni-muted text-sm text-center w-full py-6">
          {t("chatList.noChatsYet")}
        </p>
      ) : filteredChats.length === 0 ? (
        <p className="text-uni-muted text-sm text-center w-full py-6">
          {t("chatList.noMatches")}
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
                <span className="font-medium text-left text-white text-sm truncate">
                  {chat.user?.username}
                </span>
                <span className="text-[10px] text-uni-muted shrink-0">
                  {chat.lastUpdated?.toDate
                    ? format(chat.lastUpdated.toDate())
                    : ""}
                </span>
              </div>
              <p
                className="text-xs text-left text-uni-muted truncate"
                translate="no"
              >
                {chat.user?.blocked?.includes(currentUser?.id)
                  ? t("chatList.blocked")
                  : chat.lastSenderId === currentUser?.id
                  ? truncateMessage(chat.lastMessage || "")
                  : truncateMessage(chat.lastTranslatedMessage || "")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatList;
