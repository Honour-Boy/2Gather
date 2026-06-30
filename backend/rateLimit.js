// Shared fixed-window, per-key rate limiter (in-memory; single instance).
//
// Used to be copy-pasted in verseRecommend.js and prayerGenerate.js — this is the
// one implementation they now share. Key on the client IP for public endpoints
// (req.ip — REQUIRES app.set("trust proxy", ...) in server.js so it's the real
// client, not the Render/Railway reverse proxy) or on the authed uid for
// token-protected ones.
//
// In-memory means the window resets on restart and isn't shared across instances;
// that's acceptable for a single Render service (the provider-side cost caps are
// the real ceiling). Horizontal scaling would move this to Redis/Firestore.
function createRateLimiter({ windowMs, max }) {
  const hits = new Map(); // key -> { count, resetAt }
  return {
    // True if `key` has exceeded `max` requests in the current window.
    limited(key) {
      const now = Date.now();
      const rec = hits.get(key);
      if (!rec || now > rec.resetAt) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return false;
      }
      rec.count += 1;
      return rec.count > max;
    },
    // Test helper: drop all counters so suites don't leak state into each other.
    _reset() {
      hits.clear();
    },
  };
}

module.exports = { createRateLimiter };
