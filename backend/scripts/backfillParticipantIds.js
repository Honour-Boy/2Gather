// One-off migration: backfill `participantIds` on legacy `chats/{id}` docs that
// were created before participant-scoped security rules existed. Once those rules
// are live, a chat without `participantIds` is unreadable, so this must run first.
//
// How participants are derived: every `userchats/{uid}` doc lists the user's chats
// as { chatId, receiverId }. A single entry therefore yields BOTH participants of
// that chat — the doc owner (uid) and its receiverId. We scan all userchats docs
// and union those into chatId -> {uidA, uidB}.
//
// The Admin SDK bypasses Firestore rules, so this works regardless of whether the
// new rules are deployed yet. It uses the service account resolved by
// ../config/firebaseAdmins.js (locally: backend/config/unicomm.json).
//
// Usage (from the backend/ folder):
//   node scripts/backfillParticipantIds.js            # DRY RUN — prints planned changes
//   node scripts/backfillParticipantIds.js --commit   # actually writes

// Node 24+ removed buffer.SlowBuffer, which firebase-admin's jws/jwa chain still
// references. Polyfill it so this script runs on Node 24/26 too (harmless on 22).
const bufferModule = require("buffer");
if (!bufferModule.SlowBuffer) {
  bufferModule.SlowBuffer = bufferModule.Buffer;
}

const admin = require("../config/firebaseAdmins");
const db = admin.firestore();

const COMMIT = process.argv.includes("--commit");

async function main() {
  // 1. Build chatId -> Set(participant uids) from every userchats doc.
  const chatParticipants = new Map();
  const userchatsSnap = await db.collection("userchats").get();
  userchatsSnap.forEach((docSnap) => {
    const ownerUid = docSnap.id;
    const chats = docSnap.data().chats || [];
    for (const c of chats) {
      if (!c || !c.chatId) continue;
      if (!chatParticipants.has(c.chatId)) chatParticipants.set(c.chatId, new Set());
      const set = chatParticipants.get(c.chatId);
      set.add(ownerUid);
      if (c.receiverId) set.add(c.receiverId);
    }
  });

  // 2. Scan chats; patch those missing a valid participantIds.
  const chatsSnap = await db.collection("chats").get();
  let alreadyOk = 0;
  let patched = 0;
  let unresolved = 0;

  for (const chatDoc of chatsSnap.docs) {
    const data = chatDoc.data();
    const existing = Array.isArray(data.participantIds) ? data.participantIds : [];
    if (existing.length >= 2) {
      alreadyOk++;
      continue;
    }

    const derived = [...(chatParticipants.get(chatDoc.id) || [])];
    if (derived.length < 2) {
      console.warn(
        `! ${chatDoc.id}: could not resolve 2 participants from userchats ` +
          `(found ${derived.length}: [${derived.join(", ")}]). Skipping — fix manually.`
      );
      unresolved++;
      continue;
    }

    console.log(
      `${COMMIT ? "PATCH " : "WOULD PATCH "}${chatDoc.id} -> participantIds: [${derived.join(", ")}]`
    );
    if (COMMIT) {
      await chatDoc.ref.update({ participantIds: derived });
    }
    patched++;
  }

  console.log(
    `\nDone. ${alreadyOk} already valid, ${patched} ${COMMIT ? "patched" : "to patch"}, ${unresolved} unresolved.`
  );
  if (!COMMIT && patched > 0) {
    console.log("Re-run with --commit to apply these changes.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
