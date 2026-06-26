// Per-user journal: a private keepsake of the verses and prayers that steadied
// you, plus free-form reflections — each with your own reflection note. Stored
// at users/{uid}/journal/{entryId} — owner-only (see firebase/firestore.rules).
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// Add an entry.
//  - kind: "reflection" (default) | "verse" | "prayer"
//  - text: the main content (the reflection, the verse text, or the prayer)
//  - reference: scripture reference for verse entries (e.g. "John 14:27")
//  - note: the user's own reflection on a saved verse/prayer
//  - mode: a MODES id (see @/lib/modes) or null for "general"
export async function addJournalEntry(
  uid,
  { kind = "reflection", reference = "", text = "", note = "", mode = null }
) {
  return addDoc(collection(db, "users", uid, "journal"), {
    kind,
    reference,
    text,
    note,
    mode: mode || null,
    createdAt: new Date(),
  });
}

// Save a verse-of-the-day / picked verse to the journal (attributed).
export const saveVerseToJournal = (uid, verse) =>
  addJournalEntry(uid, {
    kind: "verse",
    reference: verse.reference || "",
    text: verse.text || "",
    mode: verse.mode || null,
  });

// Save a prayer (e.g. a prayer message from chat) to the journal.
export const savePrayerToJournal = (uid, text, mode = null) =>
  addJournalEntry(uid, { kind: "prayer", text, mode });

// Update just the reflection note on an entry.
export async function updateJournalNote(uid, entryId, note) {
  return updateDoc(doc(db, "users", uid, "journal", entryId), { note });
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
