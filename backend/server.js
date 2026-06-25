const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { userchatsSyncHandler } = require("./userchats");

dotenv.config();

const app = express();
const port = process.env.PORT || 8001;

// Parse comma-separated CORS origins from env (trimmed, empties removed) so the
// deployed frontend and local dev both work without code edits. Defaults to
// local Vite. e.g. CORS_ORIGIN=https://unicomm-org.vercel.app,http://localhost:5173
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

// Start the server only when run directly (not when imported by tests).
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

module.exports = { app, parseAllowedOrigins };
