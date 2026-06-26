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
//   3. backend/config/serviceAccount.json     — local fallback (gitignored; see .gitignore).
// See DEPLOYMENT.md for how to obtain and set the credential.
function resolveCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.credential.applicationDefault();
  }
  // Local-only fallback: the 2Gather (gather-bd64a) service-account JSON.
  // Download via Firebase console → gather-bd64a → Project settings →
  // Service accounts → Generate new private key, then save it here. Gitignored.
  const fs = require('fs');
  const path = require('path');
  const localKey = path.join(__dirname, 'serviceAccount.json');
  if (fs.existsSync(localKey)) {
    return admin.credential.cert(require('./serviceAccount.json'));
  }
  throw new Error(
    'No Firebase credential found. Set FIREBASE_SERVICE_ACCOUNT or ' +
    'GOOGLE_APPLICATION_CREDENTIALS, or place a gather-bd64a service-account key ' +
    'at backend/config/serviceAccount.json.'
  );
}

admin.initializeApp({ credential: resolveCredential() });

module.exports = admin;
