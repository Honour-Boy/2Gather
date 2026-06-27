import axios from "axios";
import { auth } from "@/lib/firebase";
import { API_URL } from "@/lib/env";

// Authed POST to the Express backend, carrying the caller's Firebase ID token.
//
// getIdToken() returns a cached token that the Firebase SDK keeps fresh in the
// background (it auto-refreshes well before the ~1h expiry). If the backend
// still rejects it (401/403 — e.g. the token lapsed right at the boundary, clock
// skew, or the session was refreshed), we force-refresh the token once and retry
// so a momentarily-stale token doesn't fail an otherwise-valid request.
export async function authedPost(path, body) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const url = `${API_URL}${path}`;
  const post = (token) =>
    axios.post(url, body, { headers: { Authorization: `Bearer ${token}` } });

  try {
    return await post(await user.getIdToken());
  } catch (err) {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      // Force a fresh token and try once more.
      return await post(await user.getIdToken(true));
    }
    throw err;
  }
}
