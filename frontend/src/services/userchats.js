import { auth } from "@/lib/firebase";
import { authedPost } from "@/lib/api";

// Ask the backend to refresh both participants' chat-list previews for `chatId`.
// Called after sending a message or creating a chat. The `userchats` index is
// server-only (Firestore rules deny client writes), so this RPC is how the index
// stays current. Best-effort: the message itself is already persisted and shows
// via the live snapshot — a failed/slow sync only means the sidebar preview lags
// (e.g. a Render cold start), never a lost message. `authedPost` sends the
// Firebase ID token (with refresh-on-401 retry) so the backend can verify the
// caller is a participant; we don't send any preview content (the backend
// re-derives it from Firestore).
export async function syncUserchats(chatId) {
  try {
    if (!auth.currentUser || !chatId) return;
    await authedPost("/api/userchats/sync", { chatId });
  } catch (err) {
    console.warn(
      "userchats sync failed; sidebar preview may lag.",
      err?.message || err
    );
  }
}
