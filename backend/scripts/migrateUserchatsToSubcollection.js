// Migrate the per-user chat index from the legacy `userchats/{uid}.chats[]`
// ARRAY to one doc per conversation: `userchats/{uid}/items/{chatId}`.
//
// Idempotent. For each entry in each user's `chats` array it writes an `items`
// doc, deriving the live preview (last message/translation/sender/time) from the
// chat's latest message so the new field shape is accurate. The old `chats`
// array field is left in place by default (so the not-yet-deployed old client
// keeps working); pass --delete-arrays to remove it AFTER the new client is live.
//
//   node backend/scripts/migrateUserchatsToSubcollection.js              # dry run
//   node backend/scripts/migrateUserchatsToSubcollection.js --commit     # write items
//   node backend/scripts/migrateUserchatsToSubcollection.js --commit --delete-arrays
//
// Run order (see ROADMAP / handoff): run this (--commit) → deploy backend + new
// client (merge to main) → deploy rules → later re-run with --delete-arrays.

// Node 24+ removed legacy SlowBuffer, which firebase-admin's jws/jwa chain still
// references (crashes on Node 26 locally). Shim before requiring admin.
const _buf = require("buffer");
if (!_buf.SlowBuffer) _buf.SlowBuffer = _buf.Buffer;

const admin = require("../config/firebaseAdmins");

const db = admin.firestore();
const COMMIT = process.argv.includes("--commit");
const DELETE_ARRAYS = process.argv.includes("--delete-arrays");

async function latestPreview(chatId) {
  const snap = await db
    .collection(`chats/${chatId}/messages`)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  const m = snap.docs[0]?.data();
  if (!m) return null;
  return {
    lastMessage: m.text || "",
    lastTranslatedMessage: m.translatedText || m.text || "",
    lastSenderId: m.senderId || null,
    lastUpdated: m.createdAt || null,
  };
}

(async () => {
  console.log(
    `Migration: userchats.chats[] → userchats/{uid}/items/{chatId}  (${
      COMMIT ? "COMMIT" : "DRY RUN"
    }${DELETE_ARRAYS ? " + delete arrays" : ""})\n`
  );

  const users = await db.collection("userchats").get();
  let items = 0;
  let arraysCleared = 0;

  for (const userDoc of users.docs) {
    const uid = userDoc.id;
    const chats = userDoc.data().chats || [];
    if (!chats.length) continue;

    for (const entry of chats) {
      if (!entry?.chatId) continue;
      const preview = (await latestPreview(entry.chatId)) || {
        lastMessage: entry.lastMessage || "",
        lastTranslatedMessage: entry.lastTranslatedMessage || entry.lastMessage || "",
        lastSenderId: null,
        lastUpdated: null,
      };
      const item = {
        chatId: entry.chatId,
        receiverId: entry.receiverId,
        ...preview,
        updatedAt:
          preview.lastUpdated ||
          userDoc.data().updatedAt ||
          admin.firestore.FieldValue.serverTimestamp(),
      };
      console.log(`  ${uid}/items/${entry.chatId}  ← receiver ${entry.receiverId}`);
      if (COMMIT) {
        await db
          .doc(`userchats/${uid}/items/${entry.chatId}`)
          .set(item, { merge: true });
      }
      items++;
    }

    if (DELETE_ARRAYS) {
      console.log(`  ${uid}: clearing legacy chats[] array`);
      if (COMMIT) {
        await userDoc.ref.update({
          chats: admin.firestore.FieldValue.delete(),
        });
      }
      arraysCleared++;
    }
  }

  console.log(
    `\n${COMMIT ? "Wrote" : "Would write"} ${items} item doc(s)` +
      (DELETE_ARRAYS ? `; cleared ${arraysCleared} array(s).` : ".") +
      (COMMIT ? "" : "  Re-run with --commit to apply.")
  );
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
