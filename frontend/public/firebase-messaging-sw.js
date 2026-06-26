/* global importScripts, firebase */
// Firebase Cloud Messaging service worker (Phase 5). Served from the web root so
// FCM can deliver background notifications. Config is for the 2Gather project
// (gather-bd64a) — web config values are public by design.
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

// FCM background messaging only needs the messaging-scoped fields — no apiKey
// (which is why this file carries none; it identifies the project for delivery).
firebase.initializeApp({
  projectId: "gather-bd64a",
  messagingSenderId: "770784241542",
  appId: "1:770784241542:web:6f449df66ebf77ed3dee07",
});

const messaging = firebase.messaging();

// Show a notification when a message arrives while the app is in the background.
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "2Gather", {
    body: body || "",
    icon: "/favicon.ico",
  });
});
