// Vite-only client env access. `import.meta.env` is statically replaced by Vite
// at build time, but Jest (CommonJS, no Vite) can't parse `import.meta`, so we
// isolate it here — tests mock this module instead of parsing it.

// LibreTranslate endpoint for per-message translation. Defaults to the
// self-hosted Hugging Face Spaces instance; override with VITE_TRANSLATE_URL.
export const TRANSLATE_URL =
  import.meta.env.VITE_TRANSLATE_URL ||
  "https://my-gpt-translator.hf.space/translate";

// Express backend base URL (Render). Used for server-side maintenance of the
// userchats index. Defaults to local dev; set VITE_API_URL in Vercel/CI.
export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8001";
