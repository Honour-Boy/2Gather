import { addDoc, collection } from "firebase/firestore";
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
