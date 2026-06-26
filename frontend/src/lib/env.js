// Vite-only client env access. `import.meta.env` is statically replaced by Vite
// at build time, but Jest (CommonJS, no Vite) can't parse `import.meta`, so we
// isolate it here — tests mock this module instead of parsing it.

// Express backend base URL (Render). Used for server-side maintenance of the
// userchats index. Defaults to local dev; set VITE_API_URL in Vercel/CI.
export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8001";
