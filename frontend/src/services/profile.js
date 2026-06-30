import {
  doc,
  getDoc,
  setDoc,
  deleteField,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// Profile read/write with a public/private split.
//
// The `users/{uid}` doc is readable by ANY signed-in user (search, suggestions,
// showing a chat partner's name/avatar need that). So PII that other users have
// no business reading must NOT live on it. These fields live in an owner-only
// subdoc `users/{uid}/private/profile` instead — see firebase/firestore.rules,
// where the subcollection is locked to the owner. To make another field private,
// just add it here (e.g. "email") — the split + merge + strip all key off this.
export const PRIVATE_PROFILE_FIELDS = ["dob", "gender"];
const PRIVATE_DOC = "profile";

const privateRef = (uid) => doc(db, "users", uid, "private", PRIVATE_DOC);

// Partition a flat profile object into { pub, priv } by PRIVATE_PROFILE_FIELDS.
export function splitProfile(fields) {
  const pub = {};
  const priv = {};
  for (const [k, v] of Object.entries(fields)) {
    if (PRIVATE_PROFILE_FIELDS.includes(k)) priv[k] = v;
    else pub[k] = v;
  }
  return { pub, priv };
}

// Read a user's full profile: the public doc merged with the owner-only private
// subdoc. Only the owner can read the private part (rules deny it for others), so
// this is meant for fetching the SIGNED-IN user's own profile. Returns null when
// there's no public doc yet (a brand-new account). Legacy docs that still carry
// dob/gender on the public doc keep working — the merge falls back to them.
export async function fetchFullProfile(uid) {
  const pubSnap = await getDoc(doc(db, "users", uid));
  if (!pubSnap.exists()) return null;

  let priv = {};
  try {
    const privSnap = await getDoc(privateRef(uid));
    if (privSnap.exists()) priv = privSnap.data();
  } catch {
    // Not the owner, or no subdoc yet — fall back to the public fields only.
  }
  return { ...pubSnap.data(), ...priv };
}

// Persist the owner-only private fields. No-op for an empty object so callers can
// pass the result of splitProfile() unconditionally.
export async function savePrivateProfile(uid, priv) {
  if (!priv || Object.keys(priv).length === 0) return;
  await setDoc(privateRef(uid), priv, { merge: true });
}

// A patch that removes any private fields lingering on the PUBLIC doc, so editing
// a profile migrates legacy data off the world-readable doc. Spread into the
// public updateDoc/setDoc.
export function stripPrivateFromPublic() {
  return PRIVATE_PROFILE_FIELDS.reduce(
    (acc, f) => ({ ...acc, [f]: deleteField() }),
    {}
  );
}
