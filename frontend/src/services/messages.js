import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { syncUserchats } from "@/services/userchats";

// Send a chat message.
//
// The message is written to the chat's `messages` subcollection, then we ping
// the backend (`POST /api/userchats/sync`) to refresh both users' sidebar
// previews. The sync is best-effort: the message is already persisted, so a
// failure only lags the sidebar preview. `kind` is optional (e.g. "prayer" for
// template/verse-composed messages, styled in MessageBubble).
export async function sendChatMessage({ chatId, currentUser, text, kind }) {
  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId: currentUser.id,
    text,
    ...(kind ? { kind } : {}),
    createdAt: new Date(),
  });

  await syncUserchats(chatId);
}

// Edit a message's text (sender only — enforced by Firestore rules). Records
// `editedAt` so the bubble can show an "edited" marker, then re-syncs the sidebar
// preview in case this was the chat's latest message.
export async function editChatMessage({ chatId, messageId, text }) {
  await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
    text,
    editedAt: serverTimestamp(),
  });
  await syncUserchats(chatId);
}

// Soft-delete a message (sender only). We keep a tombstone (`deleted: true`) and
// clear the text rather than hard-deleting, so the other participant sees "this
// message was deleted" instead of the row vanishing. Re-syncs the sidebar preview.
export async function deleteChatMessage({ chatId, messageId }) {
  await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
    deleted: true,
    text: "",
    editedAt: serverTimestamp(),
  });
  await syncUserchats(chatId);
}

// Forward a message's text to one or more other chats (a fresh message in each,
// authored by the current user). Best-effort per target; resolves once all are
// attempted. Returns the number successfully sent.
export async function forwardChatMessage({ chatIds, currentUser, text, kind }) {
  const targets = (chatIds || []).filter(Boolean);
  const results = await Promise.allSettled(
    targets.map((chatId) => sendChatMessage({ chatId, currentUser, text, kind }))
  );
  return results.filter((r) => r.status === "fulfilled").length;
}
