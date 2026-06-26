# 2Gather — frontend

The 2Gather web client — React 18 + Vite + Tailwind. 2Gather is a faith-based
togetherness app: real-time prayer chat, a themed Bible-verse engine, life-situation
modes, and a private journal. (English-only — no translation/i18n.)

See the [root README](../README.md) for the full overview, stack, and setup.

```bash
npm install
npm run dev     # Vite dev server → http://localhost:5173
npm run build   # production build
npm run lint    # ESLint (CI hard gate: --max-warnings 0)
npm test        # frontend Jest project (run from repo root: npm test)
```

Design tokens (the warm gold + soft-blue palette) live in `tailwind.config.js`.
