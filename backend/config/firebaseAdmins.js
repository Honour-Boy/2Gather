// Node 24+ removed the legacy `SlowBuffer`, which firebase-admin's jws/jwa crypto
// chain still references. Render runs Node 22 (where it exists, so this is a
// no-op), but shimming here lets the backend + scripts run on newer local Node.
const _buf = require('buffer');
if (!_buf.SlowBuffer) _buf.SlowBuffer = _buf.Buffer;

const admin = require('firebase-admin');

// Resolve service-account credentials in priority order so the SAME code runs
// locally and on any host (Render, CI, etc.) with no edits:
//   1. FIREBASE_SERVICE_ACCOUNT       — the full service-account JSON as a string
//                                        (set as a secret on Render / GitHub Actions).
//   2. GOOGLE_APPLICATION_CREDENTIALS  — path to a JSON file (Google ADC standard).
//   3. backend/config/unicomm.json     — local fallback (gitignored; see .gitignore).
// See DEPLOYMENT.md for how to obtain and set the credential.
function resolveCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.credential.applicationDefault();
  }
  // Local-only fallback. Never committed.
  const serviceAccount = require('./unicomm.json');
  return admin.credential.cert(serviceAccount);
}

admin.initializeApp({ credential: resolveCredential() });

module.exports = admin;
