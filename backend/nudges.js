// Scheduled engagement nudges (Phase 5): a once-a-day "verse for your day" push,
// scoped to the user's chosen theme, respecting an opt-in, quiet hours, and a
// ~daily frequency cap. Pure decision logic is unit-tested; `runNudges` is the
// thin Firestore/FCM integration. `admin` is passed in (never required here) so
// this imports cleanly in tests.
const { getDailyVerse } = require("./verses");

function toMillis(v) {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v.toDate === "function") return v.toDate().getTime();
  if (v instanceof Date) return v.getTime();
  return 0;
}

// Is `hour` (0–23) inside the quiet window? Supports overnight windows where
// start > end (e.g. 22 → 7). No window / start === end means "never quiet".
function isQuietHours(quietHours, hour) {
  if (!quietHours) return false;
  const { start, end } = quietHours;
  if (start == null || end == null || start === end) return false;
  if (start > end) return hour >= start || hour < end;
  return hour >= start && hour < end;
}

// Should this user receive a nudge right now?
function shouldSendNudge(userData, now = new Date()) {
  const prefs = (userData && userData.notificationPrefs) || {};
  if (prefs.nudges !== true) return false;

  const tokens = Array.isArray(userData && userData.fcmTokens)
    ? userData.fcmTokens.filter(Boolean)
    : [];
  if (tokens.length === 0) return false;

  if (isQuietHours(prefs.quietHours, now.getHours())) return false;

  // Frequency cap: at most ~once per day.
  const lastMs = toMillis(userData.lastNudgedAt);
  if (lastMs && now.getTime() - lastMs < 20 * 60 * 60 * 1000) return false;

  return true;
}

function buildNudgeForUser(userData, dateStr) {
  const prefs = (userData && userData.notificationPrefs) || {};
  const verse = getDailyVerse(dateStr, prefs.nudgeTheme || undefined);
  if (!verse) return null;
  return {
    notification: {
      title: "A verse for your day",
      body: `“${String(verse.text).slice(0, 120)}” — ${verse.reference}`,
    },
    data: { type: "nudge" },
  };
}

// Send nudges to every eligible opted-in user. Best-effort per user.
async function runNudges(admin, now = new Date()) {
  const db = admin.firestore();
  const snap = await db
    .collection("users")
    .where("notificationPrefs.nudges", "==", true)
    .get();

  const dateStr = now.toISOString().slice(0, 10);
  let sent = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (!shouldSendNudge(data, now)) continue;
    const payload = buildNudgeForUser(data, dateStr);
    if (!payload) continue;
    const tokens = data.fcmTokens.filter(Boolean);
    try {
      await admin.messaging().sendEachForMulticast({ tokens, ...payload });
      await docSnap.ref.set({ lastNudgedAt: new Date() }, { merge: true });
      sent += 1;
    } catch (e) {
      console.warn("nudge send failed for", docSnap.id, e && e.message);
    }
  }
  return sent;
}

module.exports = { isQuietHours, shouldSendNudge, buildNudgeForUser, runNudges };
