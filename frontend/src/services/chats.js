import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// One-time read of the current user's conversations for pickers (e.g. forwarding
// a message, or sharing a journal entry/verse). Mirrors ChatList's live source:
// the server-maintained index at userchats/{uid}/items, joined to each partner's
// profile. Returns [{ chatId, user }], most-recent first. Best-effort per row.
export async function fetchUserChats(uid) {
  if (!uid) return [];
  const itemsSnap = await getDocs(
    query(collection(db, "userchats", uid, "items"), orderBy("updatedAt", "desc"))
  );
  const items = itemsSnap.docs.map((d) => d.data());
  const rows = await Promise.all(
    items.map(async (item) => {
      try {
        const userSnap = await getDoc(doc(db, "users", item.receiverId));
        return {
          chatId: item.chatId,
          user: { ...userSnap.data(), id: item.receiverId },
        };
      } catch {
        return { chatId: item.chatId, user: { id: item.receiverId } };
      }
    })
  );
  return rows.filter((r) => r.chatId);
}
