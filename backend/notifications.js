// FCM push notifications (Phase 5). Best-effort — a failure here never blocks
// the message flow. `admin` is passed in (never required at module load) so this
// imports cleanly in tests without credentials.

// Respect the recipient's preference. Default ON unless they explicitly opted out.
function shouldNotifyUser(userData) {
  const prefs = (userData && userData.notificationPrefs) || {};
  return prefs.newMessages !== false;
}

function buildMessagePayload({ senderName, preview } = {}) {
  return {
    notification: {
      title: senderName ? `${senderName} sent you a prayer` : "New prayer on 2Gather",
      body: preview ? String(preview).slice(0, 140) : "Open 2Gather to read it.",
    },
    data: { type: "new_message" },
  };
}

// Notify the *other* participant of `chatId` about the caller's latest message.
// Reads tokens + prefs from Firestore, sends via FCM, and prunes dead tokens.
async function notifyNewMessage(admin, { chatId, callerUid }) {
  const db = admin.firestore();

  const chatSnap = await db.doc(`chats/${chatId}`).get();
  if (!chatSnap.exists) return;
  const ids = chatSnap.data().participantIds || [];
  const recipientUid = ids.find((id) => id !== callerUid);
  if (!recipientUid) return;

  const [recipSnap, callerSnap, latestSnap] = await Promise.all([
    db.doc(`users/${recipientUid}`).get(),
    db.doc(`users/${callerUid}`).get(),
    db.collection(`chats/${chatId}/messages`).orderBy("createdAt", "desc").limit(1).get(),
  ]);

  if (!recipSnap.exists) return;
  const recip = recipSnap.data() || {};
  if (!shouldNotifyUser(recip)) return;

  const tokens = Array.isArray(recip.fcmTokens) ? recip.fcmTokens.filter(Boolean) : [];
  if (tokens.length === 0) return;

  const caller = (callerSnap.exists && callerSnap.data()) || {};
  const senderName = caller.fullName || caller.username || null;
  const latest = latestSnap.docs[0] && latestSnap.docs[0].data();
  const preview = latest ? latest.text || "" : "";

  const payload = buildMessagePayload({ senderName, preview });
  const resp = await admin.messaging().sendEachForMulticast({ tokens, ...payload });

  // Prune tokens FCM reports as permanently invalid.
  const dead = [];
  (resp.responses || []).forEach((r, i) => {
    if (!r.success) {
      const code = (r.error && r.error.code) || "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-registration-token") ||
        code.includes("invalid-argument")
      ) {
        dead.push(tokens[i]);
      }
    }
  });
  if (dead.length) {
    await db
      .doc(`users/${recipientUid}`)
      .set({ fcmTokens: admin.firestore.FieldValue.arrayRemove(...dead) }, { merge: true });
  }
}

module.exports = { shouldNotifyUser, buildMessagePayload, notifyNewMessage };
