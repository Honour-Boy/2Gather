// Per-user journal (Phase 4): private reflections tagged by Mode. Stored at
// users/{uid}/journal/{entryId} — owner-only (see firebase/firestore.rules).
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// Add an entry. `mode` is a MODES id (see @/lib/modes) or null for "general".
export async function addJournalEntry(uid, { mode, body }) {
  return addDoc(collection(db, "users", uid, "journal"), {
    mode: mode || null,
    body,
    createdAt: new Date(),
  });
}

// Subscribe to the user's entries, newest first. Returns the unsubscribe fn.
export function subscribeJournal(uid, cb) {
  const q = query(
    collection(db, "users", uid, "journal"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

export async function deleteJournalEntry(uid, entryId) {
  return deleteDoc(doc(db, "users", uid, "journal", entryId));
}
