# 2Gather

**2Gather** is a faith-based togetherness app — a warm, quiet place to pray together. It pairs
real-time **prayer chat** with a themed **Bible-verse engine**, life-situation **Modes**, and a
private **journal** for the verses and prayers that steady you.

> Brand: warm gold + soft blue on cream, with heart + cross motifs.

## What's inside

- **Prayer chat** — real-time 1:1 messaging with one-tap **prayer** messages (templates + shared
  Bible verses), **edit / delete / forward**, presence, and blocking. Save or share any verse or
  prayer to a partner.
- **Bible-verse engine** — themed sets (Journey & Trust, Courage, Rest, Gratitude, Peace) curated
  across the **whole Bible**, with verbatim, attributed text from **API.Bible** in multiple
  translations (public-domain WEB / KJV / ASV + licensed NIV / NKJV / NLT) and a curated seed as an
  offline fallback. Includes a **Verse of the Day**, whole-Bible search, and AI **verse
  recommendations** for a free-text prayer request.
- **AI-assisted prayer** *(opt-in)* — a scripture-first wizard drafts a short, fully **editable**
  starter prayer for what you're facing. The prose is AI-generated, but **scripture stays real and
  attributed — never written or quoted by the model.**
- **Modes** — Travel, Interview Prep, Business Pitch, Promotion & Opportunity, Downtime & Recovery —
  each re-scopes your verses, prayer templates, and nudges to what you're walking through.
- **Journal** — save verses and prayers (from the verse card or a chat message) with your own
  reflection notes; filter by Verses / Prayers / Reflections.
- **Notifications** — Firebase Cloud Messaging for new-prayer alerts and a gentle daily verse
  nudge (with quiet hours + frequency caps).

> **English-only.** 2Gather is intentionally a single-language (English) app — there is no UI
> translation or per-message translation.

## Stack

- **Frontend:** React 18 + Vite + Tailwind (`/frontend`), routing via React Router, client state
  via Zustand. Design tokens live in `frontend/tailwind.config.js`.
- **Backend:** Node.js + Express (CommonJS, `/backend`) — verse + prayer-template APIs, the
  `userchats` index sync, FCM push, and the verse-nudge scheduler. AI features use an optional
  **OpenAI-compatible** LLM (cost-guardrailed) and **API.Bible** for verse text; both degrade
  gracefully to the curated offline corpus when unconfigured.
- **Realtime:** Firebase **Firestore `onSnapshot`** subscriptions (no WebSocket / Socket.IO).
- **Database & Auth:** Firebase Firestore (`users`, `userchats`, `chats`, per-user `journal`) +
  Firebase Auth (Email/Password + Google). Firestore rules/indexes live in `firebase/`.
- **Messaging:** Firebase Cloud Messaging (FCM).

## Getting started

### Requirements

- Node.js 20+ and npm
- A Firebase project (Firestore + Auth + Cloud Messaging) with its Web config and an Admin
  service-account key

### Setup

```bash
git clone <repository-url>
cd 2GatherApp

# install dependencies (root test harness + each package)
npm install
npm install --prefix frontend
npm install --prefix backend
```

**Environment variables** (copy the examples; real values are gitignored):

- `frontend/.env` — from `frontend/.env.example` (`VITE_API_KEY`, `VITE_API_URL`, and
  `VITE_FIREBASE_VAPID_KEY` to enable push).
- `backend/.env` — from `backend/.env.example`, **and** place the Firebase Admin service-account
  JSON at `backend/config/serviceAccount.json` (gitignored) for local dev. The AI keys
  (`AI_API_KEY`, `BIBLE_API_KEY`) are **optional** — without them the app falls back to its curated
  corpus.

### Run (two terminals)

```bash
npm run dev --prefix frontend   # Vite dev server → http://localhost:5173
npm run dev --prefix backend    # Express + nodemon → http://localhost:8001
```

### Test & lint

```bash
npm test                        # backend (node) + frontend (jsdom) Jest projects
npm run lint --prefix frontend  # ESLint (a hard gate in CI: --max-warnings 0)
```

## Deployment

- **Frontend → Vercel** (auto-deploys `main`).
- **Backend → Railway** via the root `Dockerfile` + `railway.json` (the live API). `render.yaml` is
  kept as an alternative Render blueprint.
- **Firestore rules + indexes → Firebase CLI**: `npm run deploy:rules`
  (or `firebase deploy --only firestore:rules,firestore:indexes`). Config in `firebase/` +
  `firebase.json`.

## Security

Authorization lives in the **Firestore security rules** (`firebase/firestore.rules`): chats and
messages are participant-scoped, profiles / journals / templates are owner-scoped, and PII
(date of birth, gender) sits in an owner-only subdoc. The one authenticated backend RPC verifies the
Firebase ID token and re-derives data server-side; secrets are never committed. See
**[SECURITY.md](./SECURITY.md)** for the full posture and the operational hardening checklist.

## License

Licensed under the MIT license.
