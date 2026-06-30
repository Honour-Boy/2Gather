import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Persist the user's consent to AI-assisted prayer generation. The Generate-a-
// Prayer wizard is available to everyone (clearly disclosed); the first time
// someone actually generates, we flip this flag on so Settings reflects their
// choice. Best-effort — a failure never blocks generation.
export function enableAiPrayerTemplates(uid) {
  if (!uid) return Promise.resolve();
  return updateDoc(doc(db, "users", uid), { aiPrayerTemplates: true });
}
