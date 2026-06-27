// Observability (backend) — Sentry error capture. OFF unless SENTRY_DSN is set;
// the @sentry/node SDK is only required when a DSN is present, so a deploy
// without it has zero overhead. Returns the Sentry instance (or null).
function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return null;
  try {
    const Sentry = require("@sentry/node");
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "production",
      tracesSampleRate: 0.1,
    });
    return Sentry;
  } catch (err) {
    console.warn("Sentry init skipped:", err && err.message);
    return null;
  }
}

module.exports = { initSentry };
