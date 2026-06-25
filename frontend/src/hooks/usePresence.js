import { useEffect } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Maintains the current user's presence in Firestore:
 *  - users/{uid}.isOnline: boolean
 *  - users/{uid}.lastSeen: serverTimestamp
 *
 * A heartbeat updates lastSeen every HEARTBEAT_MS while the tab is visible.
 * On pagehide / unload / sign-out, isOnline is flipped to false.
 * Readers should consider a user offline if isOnline === false OR lastSeen is
 * older than STALE_MS (handled in PresenceIndicator).
 */
const HEARTBEAT_MS = 30 * 1000;

export default function usePresence(uid) {
  useEffect(() => {
    if (!uid) return;
    const userRef = doc(db, "users", uid);

    const setOnline = () =>
      updateDoc(userRef, {
        isOnline: true,
        lastSeen: serverTimestamp(),
      }).catch(() => {});

    const setOffline = () =>
      updateDoc(userRef, {
        isOnline: false,
        lastSeen: serverTimestamp(),
      }).catch(() => {});

    setOnline();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") setOnline();
    }, HEARTBEAT_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") setOnline();
      else setOffline();
    };
    const onPageHide = () => setOffline();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
      setOffline();
    };
  }, [uid]);
}

export const STALE_MS = 90 * 1000;

export function isUserOnline(userDoc) {
  if (!userDoc) return false;
  if (userDoc.isOnline !== true) return false;
  const ls = userDoc.lastSeen;
  if (!ls) return true;
  const ts =
    typeof ls?.toMillis === "function"
      ? ls.toMillis()
      : ls?.seconds
      ? ls.seconds * 1000
      : 0;
  if (!ts) return true;
  return Date.now() - ts < STALE_MS;
}
