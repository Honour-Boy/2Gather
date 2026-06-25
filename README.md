# UniComm

UniComm is a minimal, dark-themed, **multilingual** team chat: every user reads and works
in their own language, and messages are **auto-translated per recipient**. It supports
email/password + Google sign-in and real-time 1:1 messaging.

> Live: frontend on **Vercel** (`https://unicomm-org.vercel.app`), backend on **Render**.

## How it works

- **Frontend:** React 18 + Vite + Tailwind (`/frontend`), routing via React Router, client
  state via Zustand.
- **Backend:** Node.js + Express (CommonJS, `/backend`) — deliberately thin: a single
  `GET /api/health` check. The Firebase client session authenticates Firestore directly, so
  there's no auth endpoint. (`firebase-admin` is used only by the one-off scripts in
  `backend/scripts/`.)
- **Realtime:** Firebase **Firestore `onSnapshot`** subscriptions (no WebSocket / Socket.IO).
- **Database & Auth:** Firebase Firestore (`users`, `userchats`, `chats`) + Firebase Auth.
- **Translation:** per-message via a LibreTranslate instance, applied per recipient's language.

## Features

- Email/password and Google authentication.
- One-time profile setup (username, preferred language, etc.).
- Real-time 1:1 chat with automatic per-recipient translation, presence, and blocking.

## Getting started

### Requirements

- Node.js 20+ and npm
- A Firebase project (Firestore + Auth) and its Web config + an Admin service-account key

### Setup

```bash
git clone <repository-url>
cd Unicomm

# install dependencies (root test harness + each package)
npm install
npm install --prefix frontend
npm install --prefix backend
```

**Environment variables** (copy the examples; real values are gitignored):

- `frontend/.env.local` — from `frontend/.env.example` (`VITE_API_KEY`, `VITE_API_URL`).
- `backend/.env` — from `backend/.env.example`, **or** place the Firebase Admin
  service-account JSON at `backend/config/unicomm.json` (gitignored) for local dev.

### Run (two terminals)

```bash
npm run dev --prefix frontend   # Vite dev server → http://localhost:5173
npm run dev --prefix backend    # Express + nodemon → http://localhost:8001
```

### Test

```bash
npm test            # backend (node) + frontend (jsdom) Jest projects
```

## Deployment

Frontend deploys to Vercel and the backend to Render; Firestore rules/indexes live in
`firebase/` and deploy via the Firebase CLI. See the deployment runbook for the full,
step-by-step process and environment/secret reference.

## Final year project

This started as my final-year university project, where I initially fine-tuned an LLM for
real-time translation. Due to issues with that model I switched to an external translation
engine, but UniComm remains a working solution for multilingual communication.

## License

Licensed under the MIT license.
