const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { userchatsSyncHandler } = require("./userchats");
const { versesHandler, dailyVerseHandler, searchVersesHandler } = require("./verses");
const { templatesHandler } = require("./prayerTemplates");

dotenv.config();

const app = express();
const port = process.env.PORT || 8001;

// Parse comma-separated CORS origins from env (trimmed, empties removed) so the
// deployed frontend and local dev both work without code edits. Defaults to
// local Vite. e.g. CORS_ORIGIN=https://2gather.vercel.app,http://localhost:5173
function parseAllowedOrigins(value) {
  return (value || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGIN);

// Middleware
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Health check — lets the host (Render) and monitors verify the service is up.
// This is the only route the backend currently serves: the old POST /api/signin
// custom-token round-trip was removed (the Firebase client session authenticates
// Firestore directly — see ROADMAP P0 #2).
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Maintain the per-user chat index server-side (the `userchats` rules deny client
// writes). The client pings this after sending a message / creating a chat; we
// verify the caller's Firebase ID token, confirm they're a participant, and
// re-derive both users' previews from Firestore. See userchats.js.
app.post("/api/userchats/sync", userchatsSyncHandler);

// Bible verse engine (Phase 3): curated, attributed verses by theme, a
// deterministic verse-of-the-day, and search. Static + public + cacheable;
// no auth or Firebase needed. See verses.js.
app.get("/api/verses", versesHandler);
app.get("/api/verses/daily", dailyVerseHandler);
app.get("/api/verses/search", searchVersesHandler);

// Prayer-template library (Phase 2): curated editable starter prayers by theme.
// Static + public + cacheable. See prayerTemplates.js.
app.get("/api/prayer-templates", templatesHandler);

// Start the server only when run directly (not when imported by tests).
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  // Engagement nudges (Phase 5): off by default. Set ENABLE_NUDGES=1 to run an
  // hourly check that sends each opted-in user a daily verse (runNudges enforces
  // quiet hours + a ~daily cap). Requires Firebase Admin credentials + FCM.
  if (process.env.ENABLE_NUDGES === "1") {
    const { runNudges } = require("./nudges");
    const admin = require("./config/firebaseAdmins");
    setInterval(
      () => runNudges(admin).catch((e) => console.warn("nudges:", e && e.message)),
      60 * 60 * 1000
    );
    console.log("Nudge scheduler enabled (hourly).");
  }
}

module.exports = { app, parseAllowedOrigins };
