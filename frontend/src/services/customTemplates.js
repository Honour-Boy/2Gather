// Per-user custom prayer templates: a user's own saved starter prayers, shown in
// the composer's template picker alongside the curated set. Stored at
// users/{uid}/prayerTemplates/{id} — owner-only (see firebase/firestore.rules).
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

// Subscribe to the user's custom templates, newest first. Returns the unsub fn.
export function subscribeCustomTemplates(uid, cb) {
  const q = query(
    collection(db, "users", uid, "prayerTemplates"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, custom: true, ...d.data() })))
  );
}

export async function addCustomTemplate(uid, { title, body }) {
  return addDoc(collection(db, "users", uid, "prayerTemplates"), {
    title: (title || "").trim() || "My prayer",
    body: (body || "").trim(),
    createdAt: new Date(),
  });
}

export async function deleteCustomTemplate(uid, id) {
  return deleteDoc(doc(db, "users", uid, "prayerTemplates", id));
}
