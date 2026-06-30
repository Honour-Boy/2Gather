# Security

How 2Gather handles secrets, and the operational hardening steps that live outside
the codebase. (Architecture-level rules are in the Engineering Bible; this file is
the practical secrets + deploy-security checklist.)

## Reporting a vulnerability

Please report security issues privately to the maintainer rather than opening a
public issue. Include steps to reproduce and the affected component (backend API,
Firestore rules, or frontend). We aim to acknowledge within a few days.

## Secret management

- **No secrets are committed.** Only `*.env.example` files are tracked; real
  values live in gitignored files (`backend/.env`, `frontend/.env`,
  `backend/config/serviceAccount.json`) or in the host dashboards (Vercel /
  Render / Railway).
- `.gitignore` blocks `.env`, `.env.*` (except `.env.example`), `**/serviceAccount*.json`,
  and `**/*firebase-adminsdk*.json`. Keep it that way.
- **Server-only vs. client.** Vite only exposes `VITE_`-prefixed vars to the
  browser bundle. Anything sensitive (the Firebase **Admin** service account,
  `AI_API_KEY`, `BIBLE_API_KEY`) is backend-only and must never get a `VITE_`
  prefix or appear in `frontend/.env`.
- The Firebase **web** API key (`VITE_API_KEY`) ships in the client bundle by
  design — it is an identifier, not a secret. It must still be **restricted** in
  Google Cloud Console (see below); Firestore security rules are the real
  authorization boundary, not the key.

## Operational hardening checklist

These are owner/ops actions performed in provider consoles — they cannot be done
from the repo.

- [ ] **Rotate the legacy `unicomm-2d7bc` credentials.** A Firebase Admin
      service-account **private key** + client email and a `JWT_SECRET` were
      previously present in the local (gitignored, never-committed) `frontend/.env`.
      The file has been scrubbed, but a private key that has touched disk should be
      treated as compromised: **revoke that service-account key** in the
      `unicomm-2d7bc` Firebase console (Project settings → Service accounts) and
      rotate the `JWT_SECRET`. The current app (`gather-bd64a`) does not use them.
- [ ] **Restrict the Firebase web API key** (`gather-bd64a`) in Google Cloud
      Console → APIs & Services → Credentials: add HTTP-referrer restrictions
      (the Vercel domain + localhost) and limit it to the APIs the app uses.
- [ ] **Deploy Firestore rules:** `firebase deploy --only firestore:rules`
      (project `gather-bd64a`). Required for message edit/delete, custom prayer
      templates, the owner-only private-profile subdoc, and the message-size bound
      to take effect live.
- [ ] **Cap AI spend at the provider.** Set a hard monthly usage limit in the
      OpenAI (or compatible) dashboard — the app's per-day budget + circuit
      breaker are the first line of defense, but the provider cap is the backstop.

## What the app already does

- Express verifies the Firebase ID token on the one authed RPC
  (`/api/userchats/sync`) and re-derives all data server-side (no client-supplied
  preview text trusted); the endpoint is rate-limited per user.
- Firestore rules are participant-scoped for chats/messages and owner-scoped for
  profiles, journals, custom templates, and the private-profile subdoc.
- The central Express error handler returns a generic 500 and never leaks stack
  traces to clients.
- Per-IP rate limiting on the public AI endpoints (with `trust proxy` set so the
  limit keys on the real client), plus a per-day AI call budget and a circuit
  breaker on a bad key / exhausted quota.
- React escapes all rendered message text (no `dangerouslySetInnerHTML`).
