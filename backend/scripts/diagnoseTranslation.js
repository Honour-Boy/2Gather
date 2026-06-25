// READ-ONLY diagnostic: why aren't messages translating?
// Dumps every user's stored `language`, then the most recently active chats with
// the last few messages' sourceLang/targetLang/text/translatedText so we can see
// whether (a) the two parties actually have different languages and (b) the
// translation is being persisted. Writes nothing.
//
//   node backend/scripts/diagnoseTranslation.js

// Node 24+ removed the legacy `SlowBuffer`, which firebase-admin's jws/jwa crypto
// chain still references (crashes on Node 26 locally). Shim it before requiring
// admin. This is a local-dev workaround only — Render runs Node 22.x.
const _buf = require("buffer");
if (!_buf.SlowBuffer) _buf.SlowBuffer = _buf.Buffer;

const admin = require("../config/firebaseAdmins");

const db = admin.firestore();

(async () => {
  console.log("=== USERS (id · username/name · language) ===");
  const users = await db.collection("users").get();
  const langById = {};
  users.forEach((d) => {
    const u = d.data();
    langById[d.id] = u.language;
    console.log(
      `${d.id}  ·  ${u.username || u.fullName || "(no name)"}  ·  language=${JSON.stringify(
        u.language
      )}`
    );
  });

  console.log("\n=== CHATS (most recent messages) ===");
  const chats = await db.collection("chats").get();
  for (const chat of chats.docs) {
    const msgsSnap = await chat.ref
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();
    if (msgsSnap.empty) continue;
    console.log(`\nchat ${chat.id}  participantIds=${JSON.stringify(chat.data().participantIds)}`);
    msgsSnap.docs.reverse().forEach((m) => {
      const x = m.data();
      const translated =
        x.translatedText && x.translatedText !== x.text
          ? "✅ translated"
          : "❌ same as original";
      console.log(
        `  [${x.sourceLang} → ${x.targetLang}] ${translated}\n` +
          `      text:        ${JSON.stringify(x.text)}\n` +
          `      translated:  ${JSON.stringify(x.translatedText)}`
      );
    });
  }

  console.log("\nDone (read-only, nothing written).");
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
