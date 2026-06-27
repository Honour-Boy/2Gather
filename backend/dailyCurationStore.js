// Firestore-backed store for the day's AI-curated verse REFERENCES (per theme,
// and the verse-of-the-day), so curated sets survive restarts/redeploys, are
// shared across instances, and a prior day's set can serve as a fallback.
//
// Only references (verse ids) are stored — translation-independent and ToS-safe;
// the text is always fetched fresh from API.Bible. Every op degrades to null/no-op
// when the Admin SDK isn't available (no FIREBASE_SERVICE_ACCOUNT), so curation
// still works (in-memory + seed) without a database.

const COL = "dailyCuration";
const docId = (kind, theme, day) => `${kind}:${theme || "general"}:${day}`;

// Lazily resolve Firestore. firebaseAdmins throws on import without credentials,
// so we try once and cache the result (null when unavailable).
let _db;
let _tried = false;
function db() {
  if (_tried) return _db;
  _tried = true;
  // Never touch a real database from tests (the dev machine has a service-account
  // file). Tests that exercise the store inject a fake via opts.store.
  if (process.env.NODE_ENV === "test") {
    _db = null;
    return _db;
  }
  try {
    _db = require("./config/firebaseAdmins").firestore();
  } catch (e) {
    console.warn("Daily-curation DB disabled (no Firebase creds):", e && e.message);
    _db = null;
  }
  return _db;
}

// The stored references for a kind/theme/day, or null.
async function getSet(kind, theme, day) {
  const d = db();
  if (!d) return null;
  try {
    const snap = await d.collection(COL).doc(docId(kind, theme, day)).get();
    if (!snap.exists) return null;
    const refs = snap.data().refs;
    return Array.isArray(refs) && refs.length ? refs : null;
  } catch (e) {
    console.warn("curation getSet:", e && e.message);
    return null;
  }
}

// Persist the day's references (best-effort).
async function saveSet(kind, theme, day, refs) {
  const d = db();
  if (!d || !Array.isArray(refs) || !refs.length) return;
  try {
    await d
      .collection(COL)
      .doc(docId(kind, theme, day))
      .set({ kind, theme: theme || "general", day, refs, createdAt: Date.now() });
  } catch (e) {
    console.warn("curation saveSet:", e && e.message);
  }
}

// The most recent prior day's references (look back up to `lookback` days), or null.
async function getRecentPrior(kind, theme, day, lookback = 7) {
  if (!db()) return null;
  const start = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(start)) return null;
  for (let i = 1; i <= lookback; i++) {
    const prev = new Date(start - i * 86_400_000).toISOString().slice(0, 10);
    const refs = await getSet(kind, theme, prev); // eslint-disable-line no-await-in-loop
    if (refs) return refs;
  }
  return null;
}

module.exports = { getSet, saveSet, getRecentPrior, _docId: docId };
