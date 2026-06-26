# 2Gather

**2Gather** is a faith-based togetherness app — a warm, quiet place to pray together. It pairs
real-time **prayer chat** with a themed **Bible-verse engine**, life-situation **Modes**, and a
private **journal** for the verses and prayers that steady you.

> Brand: warm gold + soft blue on cream, with heart + cross motifs.

## What's inside

- **Prayer chat** — real-time 1:1 messaging with one-tap **prayer** messages (templates + shared
  Bible verses), presence, and blocking.
- **Bible-verse engine** — a curated, attributed **World English Bible** dataset across themes
  (Journey & Trust, Courage, Rest, Gratitude, Peace), with a **Verse of the Day** and search.
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
  `userchats` index sync, FCM push, and the verse-nudge scheduler.
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
  JSON at `backend/config/serviceAccount.json` (gitignored) for local dev.

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

The frontend deploys to Vercel and the backend to Render; Firestore rules/indexes deploy via the
Firebase CLI (`firebase/`). See `render.yaml` and `firebase.json`.

## License

Licensed under the MIT license.
