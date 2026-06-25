// Server-side maintenance of the per-user chat index (userchats/{uid}/items/{chatId}).
//
// WHY THIS LIVES ON THE BACKEND: a message sender needs to update the recipient's
// chat preview, which Firestore rules can't safely authorize ("user A may write
// user B's index entry, only these fields"). So the `userchats` rule denies all
// client writes and this endpoint — running with Admin privileges — is the only
// writer. (The Cloud Functions trigger version was dropped because triggers
// require the Blaze plan; this runs on the existing Render service instead.)
//
// TRUST MODEL: the client only tells us *which* chat changed. We re-derive the
// preview from authoritative Firestore data (the chat doc + its latest message),
// and we reject callers who aren't a participant — so a client can't forge
// another user's index or inject arbitrary preview text.
//
// admin is required lazily (inside the handler) so importing this module — e.g.
// when server.js is imported by tests — never initializes firebase-admin or needs
// credentials (CI has none).

let _admin;
function getAdmin() {
  if (!_admin) _admin = require("./config/firebaseAdmins");
  return _admin;
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// Recompute both participants' index entries for `chatId` from the chat's latest
// message. `callerUid` must be a participant. Idempotent (merge set).
async function syncChatIndex(chatId, callerUid) {
  const admin = getAdmin();
  const db = admin.firestore();

  const chatSnap = await db.doc(`chats/${chatId}`).get();
  if (!chatSnap.exists) throw httpError(404, "chat not found");

  const ids = chatSnap.data().participantIds;
  if (!Array.isArray(ids) || ids.length !== 2) throw httpError(400, "invalid chat");
  if (!ids.includes(callerUid)) throw httpError(403, "not a participant");

  const latestSnap = await db
    .collection(`chats/${chatId}/messages`)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  const latest = latestSnap.docs[0] && latestSnap.docs[0].data();

  const preview = latest
    ? {
        lastMessage: latest.text || "",
        lastTranslatedMessage: latest.translatedText || latest.text || "",
        lastSenderId: latest.senderId || null,
        lastUpdated: latest.createdAt || null,
      }
    : { lastMessage: "", lastTranslatedMessage: "", lastSenderId: null, lastUpdated: null };

  const [a, b] = ids;
  const { serverTimestamp } = admin.firestore.FieldValue;
  await Promise.all([
    db
      .doc(`userchats/${a}/items/${chatId}`)
      .set({ chatId, receiverId: b, ...preview, updatedAt: serverTimestamp() }, { merge: true }),
    db
      .doc(`userchats/${b}/items/${chatId}`)
      .set({ chatId, receiverId: a, ...preview, updatedAt: serverTimestamp() }, { merge: true }),
  ]);
}

// POST /api/userchats/sync  { chatId }   Authorization: Bearer <Firebase ID token>
async function userchatsSyncHandler(req, res) {
  try {
    const authz = req.headers.authorization || "";
    const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
    if (!token) return res.status(401).json({ error: "missing bearer token" });

    const decoded = await getAdmin().auth().verifyIdToken(token);

    const chatId = req.body && req.body.chatId;
    if (!chatId) return res.status(400).json({ error: "chatId is required" });

    await syncChatIndex(chatId, decoded.uid);
    return res.json({ ok: true });
  } catch (err) {
    const status = err.status || (err.code === "auth/argument-error" ? 401 : 500);
    if (status >= 500) console.error("userchats sync failed:", err);
    return res
      .status(status)
      .json({ error: status >= 500 ? "internal error" : err.message });
  }
}

module.exports = { syncChatIndex, userchatsSyncHandler };
