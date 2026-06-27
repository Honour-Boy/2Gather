// API.Bible client (Phase 9) — the authoritative source of verse TEXT. The AI
// only ever proposes references; this fetches the verbatim words by reference and
// is the single place verse text comes from. Public-domain default (WEB) so the
// resolved text is freely cacheable.
//
// Guardrails mirror the OpenAI ones in verseRecommend.js: cache-first, a per-day
// API-call budget (free tier is ~5K/day), and a circuit breaker on a bad key.
// Disabled (no BIBLE_API_KEY) → callers fall back to the static seed corpus.

const axios = require("axios");
const { parseReference, humanBook } = require("./bibleRef");

const DEFAULTS = {
  baseUrl: "https://api.scripture.api.bible/v1",
  // World English Bible (public domain). Confirm/override via `GET /bibles`
  // (listBibles) and the BIBLE_ID env var if this id ever changes.
  bibleId: "9879dbb7cfe39e4d-04",
  dailyLimit: 4500, // stay under the 5K/day free tier
  timeoutMs: 8000,
};

function intEnv(name, def, min, max) {
  const n = parseInt(process.env[name], 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function bibleConfig() {
  return {
    apiKey: process.env.BIBLE_API_KEY || "",
    baseUrl: (process.env.BIBLE_API_BASE || DEFAULTS.baseUrl).replace(/\/+$/, ""),
    bibleId: process.env.BIBLE_ID || DEFAULTS.bibleId,
    dailyLimit: intEnv("BIBLE_DAILY_LIMIT", DEFAULTS.dailyLimit, 0, 1000000),
    timeoutMs: intEnv("BIBLE_TIMEOUT_MS", DEFAULTS.timeoutMs, 1000, 30000),
  };
}

// --- per-day API-call budget + breaker + cache ---
const budget = { day: "", count: 0 };
const utcDay = () => new Date().toISOString().slice(0, 10);
function rollDay() {
  if (budget.day !== utcDay()) {
    budget.day = utcDay();
    budget.count = 0;
  }
}
function budgetRemaining() {
  rollDay();
  return bibleConfig().dailyLimit - budget.count;
}
function noteCall() {
  rollDay();
  budget.count += 1;
}

const BREAKER_MS = 30 * 60_000;
let breakerUntil = 0;
const breakerOpen = () => Date.now() < breakerUntil;
const tripBreaker = () => {
  breakerUntil = Date.now() + BREAKER_MS;
};

// Resolved text is public-domain + immutable → cache hard (24h), bounded.
const CACHE_TTL = 24 * 60 * 60_000;
const CACHE_MAX = 5000;
const cache = new Map(); // key -> { at, value }
function cacheGet(key) {
  const rec = cache.get(key);
  if (rec && Date.now() - rec.at < CACHE_TTL) return rec.value;
  return undefined;
}
function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(key, { at: Date.now(), value });
}

// Is a live API.Bible call permitted? (key set, breaker closed, budget left)
function bibleEnabled() {
  return Boolean(bibleConfig().apiKey) && !breakerOpen() && budgetRemaining() > 0;
}

function cleanText(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

async function apiGet(path, params, cfg) {
  try {
    const { data } = await axios.get(`${cfg.baseUrl}${path}`, {
      params,
      headers: { "api-key": cfg.apiKey },
      timeout: cfg.timeoutMs,
    });
    return data;
  } catch (err) {
    const status = err && err.response && err.response.status;
    if (status === 401 || status === 403) tripBreaker(); // bad key → stop calling
    throw err;
  }
}

// Resolve a free-form reference ("John 3:16", "1 Cor 13:4-7") to verbatim text.
// Returns { id, reference, text } or null (unparseable book, no resolution, or
// API disabled/over-budget). NEVER returns AI-authored text.
async function getPassage(reference) {
  const parsed = parseReference(reference);
  if (!parsed) return null;

  const cfg = bibleConfig();
  const cacheK = `${cfg.bibleId}:passage:${parsed.id}`;
  const cached = cacheGet(cacheK);
  if (cached) return cached;
  if (!bibleEnabled()) return null;

  noteCall();
  try {
    const data = await apiGet(
      `/bibles/${cfg.bibleId}/passages/${encodeURIComponent(parsed.id)}`,
      {
        "content-type": "text",
        "include-notes": false,
        "include-titles": false,
        "include-chapter-numbers": false,
        "include-verse-numbers": false,
        "include-verse-spans": false,
      },
      cfg
    );
    const text = cleanText(data && data.data && data.data.content);
    if (!text) return null;
    const value = { id: parsed.id, reference: parsed.reference, text };
    cacheSet(cacheK, value);
    return value;
  } catch {
    return null; // API error (breaker already tripped on 401/403 inside apiGet)
  }
}

// Whole-Bible keyword search → [{ id, reference, text }] (capped). Returns [] when
// disabled/over-budget so callers can fall back.
async function searchBible(query, limit = 12) {
  const q = String(query || "").trim();
  if (!q) return [];

  const cfg = bibleConfig();
  const cacheK = `${cfg.bibleId}:search:${limit}:${q.toLowerCase()}`;
  const cached = cacheGet(cacheK);
  if (cached) return cached;
  if (!bibleEnabled()) return [];

  noteCall();
  try {
    const data = await apiGet(
      `/bibles/${cfg.bibleId}/search`,
      { query: q, limit, sort: "relevance" },
      cfg
    );
    const verses = (data && data.data && data.data.verses) || [];
    const out = verses
      .map((v) => ({ id: v.id, reference: v.reference, text: cleanText(v.text) }))
      .filter((v) => v.id && v.text);
    cacheSet(cacheK, out);
    return out;
  } catch {
    return []; // API error → caller falls back
  }
}

// Helper to discover available bibles + their ids (run once when configuring).
async function listBibles(language = "eng") {
  const cfg = bibleConfig();
  if (!cfg.apiKey) throw new Error("BIBLE_API_KEY not set");
  const data = await apiGet(`/bibles`, { language }, cfg);
  return ((data && data.data) || []).map((b) => ({
    id: b.id,
    name: b.name,
    abbreviation: b.abbreviation,
  }));
}

function _resetState() {
  budget.day = "";
  budget.count = 0;
  breakerUntil = 0;
  cache.clear();
}

module.exports = {
  bibleConfig,
  bibleEnabled,
  budgetRemaining,
  noteCall,
  breakerOpen,
  tripBreaker,
  getPassage,
  searchBible,
  listBibles,
  humanBook,
  _resetState,
};
