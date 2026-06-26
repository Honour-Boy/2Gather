// FCM web-push client (Phase 5). Degrades gracefully: every failure mode throws
// a clear Error the UI can show, and nothing here runs unless the user opts in.
//
// To activate, set VITE_FIREBASE_VAPID_KEY in frontend/.env — the Web Push
// certificate key pair from Firebase Console → Project settings → Cloud
// Messaging → Web configuration. The service worker lives at
// public/firebase-messaging-sw.js (served from the web root).
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { arrayUnion, doc, setDoc } from "firebase/firestore";
import { app, db } from "@/lib/firebase";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Request permission, register an FCM token, and save it on the user's doc
// (alongside an explicit opt-in). Returns the token.
export async function enableNotifications(uid) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    throw new Error("This browser doesn't support notifications.");
  }
  if (!(await isSupported())) {
    throw new Error("Push messaging isn't supported in this browser.");
  }
  if (!VAPID_KEY) {
    throw new Error("Push isn't configured yet (missing VITE_FIREBASE_VAPID_KEY).");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey: VAPID_KEY });
  if (!token) throw new Error("Could not obtain a notification token.");

  await setDoc(
    doc(db, "users", uid),
    { fcmTokens: arrayUnion(token), notificationPrefs: { newMessages: true } },
    { merge: true }
  );
  return token;
}

// Subscribe to foreground messages (tab focused). Returns an unsubscribe fn
// (a no-op when unsupported).
export async function onForegroundMessage(cb) {
  if (!(await isSupported())) return () => {};
  return onMessage(getMessaging(app), cb);
}
