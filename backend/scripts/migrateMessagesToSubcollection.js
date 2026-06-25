// One-off migration: move messages out of the `messages` array on each
// `chats/{id}` doc and into a `chats/{id}/messages` subcollection (ROADMAP
// Phase 4 / P0 #3 follow-through). After the frontend switched to reading the
// subcollection, legacy in-array messages would otherwise appear to vanish, so
// this copies them over (preserving order and timestamps) and clears the array.
//
// Each array entry looks like { senderId, text, translatedText, createdAt }.
// Older entries predate the per-message `sourceLang` field; we leave it unset
// and the UI falls back to the viewer-derived label for those.
//
// Idempotent: a chat whose subcollection already has documents is skipped, so
// re-running is safe. The Admin SDK bypasses Firestore rules, so this works
// regardless of whether the new rules are deployed. Creds resolve via
// ../config/firebaseAdmins.js (locally: backend/config/unicomm.json).
//
// Usage (from the backend/ folder):
//   node scripts/migrateMessagesToSubcollection.js            # DRY RUN
//   node scripts/migrateMessagesToSubcollection.js --commit   # actually writes

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
  const chatsSnap = await db.collection("chats").get();
  let skippedEmpty = 0;
  let skippedExisting = 0;
  let migratedChats = 0;
  let migratedMessages = 0;

  for (const chatDoc of chatsSnap.docs) {
    const data = chatDoc.data();
    const messages = Array.isArray(data.messages) ? data.messages : [];

    if (messages.length === 0) {
      skippedEmpty++;
      continue;
    }

    // Skip chats that already have a populated subcollection (idempotency).
    const existing = await chatDoc.ref.collection("messages").limit(1).get();
    if (!existing.empty) {
      console.log(`= ${chatDoc.id}: subcollection already populated, skipping.`);
      skippedExisting++;
      continue;
    }

    console.log(
      `${COMMIT ? "MIGRATE " : "WOULD MIGRATE "}${chatDoc.id} -> ` +
        `${messages.length} message(s) into subcollection`
    );

    if (COMMIT) {
      // Write in a batch; preserve original order via createdAt (already on
      // each entry). Clear the array afterward so it can't drift.
      const batch = db.batch();
      const msgsCol = chatDoc.ref.collection("messages");
      for (const m of messages) {
        const ref = msgsCol.doc();
        batch.set(ref, {
          senderId: m.senderId ?? null,
          text: m.text ?? "",
          translatedText: m.translatedText ?? m.text ?? "",
          createdAt: m.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
          ...(m.sourceLang ? { sourceLang: m.sourceLang } : {}),
        });
      }
      batch.update(chatDoc.ref, {
        messages: admin.firestore.FieldValue.delete(),
      });
      await batch.commit();
    }

    migratedChats++;
    migratedMessages += messages.length;
  }

  console.log(
    `\nDone. ${migratedChats} chat(s) ${COMMIT ? "migrated" : "to migrate"} ` +
      `(${migratedMessages} message(s)), ${skippedExisting} already migrated, ` +
      `${skippedEmpty} with no array messages.`
  );
  if (!COMMIT && migratedChats > 0) {
    console.log("Re-run with --commit to apply these changes.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
