// AI Verse Recommendations (Phase 8). Given a free-text prayer request, return
// 1–3 REAL, attributed verses from the verse engine that fit it.
//
// The non-negotiable: the model NEVER supplies scripture. We retrieve candidate
// verses ourselves (backend/verses.js, public-domain WEB); the model's only job
// is to RANK/SELECT from the candidates we hand it (returning their numbers).
// Every returned verse is looked up from our own data, and any id the model
// invents is dropped. No prayer text, paraphrase, or commentary is ever
// generated — the user prays in their own words.
//
// Degrades gracefully: with no AI key configured (or the provider down/over
// quota), it maps the request to themes by keyword and returns those verses.

const axios = require("axios");
const { THEMES, TRANSLATION, VERSES, getVersesByTheme } = require("./verses");
const bibleApi = require("./bibleApi");
const { parseReference } = require("./bibleRef");

// --- Keyword → theme mapping (the no-LLM path, and how we pick candidates) ---
// A request can hit several themes (e.g. "anxious" → courage + peace); we score
// each theme by how many of its keywords appear and rank by that.
const THEME_KEYWORDS = {
  "journey-and-trust": [
    "travel", "trip", "journey", "road", "flight", "fly", "drive", "driving",
    "commute", "moving", "relocat", "uncertain", "future", "decision", "direction",
    "unknown", "trust", "guidance", "guide", "lost", "transition", "next step",
  ],
  courage: [
    "interview", "presentation", "present", "pitch", "exam", "test", "audition",
    "afraid", "fear", "scared", "scare", "nervous", "bold", "confront", "brave",
    "courage", "challenge", "stage", "speak", "speaking", "perform", "compete",
    "competition", "deadline", "intimidat",
  ],
  rest: [
    "tired", "exhausted", "weary", "burnout", "burned out", "burnt out", "rest",
    "sleep", "insomnia", "overwhelmed", "busy", "recover", "recovery", "sick",
    "illness", "healing", "heal", "burden", "drained", "break", "worn out",
  ],
  gratitude: [
    "thankful", "grateful", "gratitude", "blessed", "blessing", "promotion",
    "promoted", "new job", "raise", "opportunity", "celebrate", "celebration",
    "praise", "good news", "answered", "provision", "provided", "thanks",
  ],
  peace: [
    "peace", "peaceful", "anxious", "anxiety", "worry", "worried", "stress",
    "stressed", "calm", "troubled", "panic", "conflict", "argument", "fight",
    "unsettled", "restless", "fearful", "comfort", "overthink",
  ],
};

// A compassionate, non-clinical redirect for inputs that signal a crisis. We
// surface comfort verses AND a real resource line (the app's own words).
const CRISIS_PATTERN =
  /\b(kill myself|killing myself|suicid|end my life|ending my life|want to die|wanna die|don'?t want to (live|be here)|hurt myself|hurting myself|self[\s-]?harm|take my (own )?life)\b/i;
const SUPPORT_MESSAGE =
  "If you're thinking about harming yourself, please reach out right now — in the US you can call or text 988 (Suicide & Crisis Lifeline), available 24/7. You are not alone, and you are deeply loved.";

const MAX_REQUEST_LEN = 500;
const MAX_CANDIDATES = 12;
const MAX_RESULTS = 3;
// When nothing matches, lean on broadly steadying themes so we always return verses.
const DEFAULT_THEMES = ["peace", "courage", "journey-and-trust"];

// Rank the themes a request touches, most-relevant first (empty if none match).
function detectThemes(request) {
  const text = String(request || "").toLowerCase();
  return THEMES.map((theme) => {
    let score = 0;
    for (const kw of THEME_KEYWORDS[theme] || []) {
      if (text.includes(kw)) score += 1;
    }
    return { theme, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.theme);
}

// Gather real, attributed candidate verses for the chosen themes (deduped, capped).
function buildCandidates(themes, max = MAX_CANDIDATES) {
  const seen = new Set();
  const out = [];
  for (const theme of themes) {
    for (const v of getVersesByTheme(theme)) {
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      out.push(v);
      if (out.length >= max) return out;
    }
  }
  return out;
}

// No-LLM ranking: prefer verses that cover the most of the matched themes
// (V8's sort is stable, so ties keep dataset order — deterministic).
function fallbackRank(candidates, themes) {
  const set = new Set(themes);
  const overlap = (v) => v.themes.filter((t) => set.has(t)).length;
  return [...candidates].sort((a, b) => overlap(b) - overlap(a));
}

// Shape a verse for the API response. Text is always from an authoritative source
// (API.Bible or the static seed) — never AI-authored. `themes` may be empty for
// whole-Bible results that aren't tied to a curated theme.
function shape(list) {
  return list
    .slice(0, MAX_RESULTS)
    .map((v) => ({ id: v.id, reference: v.reference, text: v.text, themes: v.themes || [] }));
}

// --- AI config + cost guardrails ---------------------------------------------
// An LLM is NEVER required and can never run away with cost. Every knob is
// env-overridable with cheap, safe defaults:
//   • pinned cheap model + small max_tokens (the reply is only verse references)
//   • request ≤ MAX_REQUEST_LEN chars
//   • a hard per-day call budget (AI_DAILY_LIMIT) → fall back when it's spent
//   • capped retries (AI_MAX_RETRIES) with backoff — never an infinite loop
//   • a circuit breaker that stops calling on a bad key / exhausted quota
//   • per-request cache + per-IP rate limit (below)
// The OpenAI-dashboard usage limit is the ultimate backstop — see .env.example.
const AI_DEFAULTS = {
  model: "gpt-4o-mini", // cheap + plenty for choosing references
  baseUrl: "https://api.openai.com/v1",
  maxRetries: 1,
  timeoutMs: 8000,
  dailyLimit: 200,
  maxOutputTokens: 60,
};

// The model only ever NAMES references (drawing on its knowledge of the whole
// Bible); it must not quote the text — we fetch the verbatim words ourselves from
// API.Bible. The prompt pushes it to read the feeling behind the words, and to
// reply with references only (which also keeps output tokens small).
const SYSTEM_PROMPT =
  "You help a person find Bible verses for what they are praying about. First " +
  "understand what they are really going through — the emotion and situation beneath " +
  'the words, not just literal keywords. For example, "I\'m tired of life" is ' +
  "discouragement or hopelessness (offer hope and strength), not physical tiredness. " +
  "Choose the 1-3 real Bible verses (from anywhere in Scripture) that speak most " +
  "directly to that underlying need. Reply with ONLY their references separated by " +
  'semicolons (e.g. "John 16:33; Philippians 4:13; Isaiah 41:10"). Do NOT quote the ' +
  "verse text, do not write a prayer, do not add any commentary.";

function intEnv(name, def, min, max) {
  const n = parseInt(process.env[name], 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function aiConfig() {
  return {
    apiKey: process.env.AI_API_KEY || "",
    model: process.env.AI_MODEL || AI_DEFAULTS.model,
    baseUrl: (process.env.AI_BASE_URL || AI_DEFAULTS.baseUrl).replace(/\/+$/, ""),
    maxRetries: intEnv("AI_MAX_RETRIES", AI_DEFAULTS.maxRetries, 0, 3),
    timeoutMs: intEnv("AI_TIMEOUT_MS", AI_DEFAULTS.timeoutMs, 1000, 30000),
    dailyLimit: intEnv("AI_DAILY_LIMIT", AI_DEFAULTS.dailyLimit, 0, 1000000),
  };
}

// Per-day call budget (UTC). In-memory — resets on restart, which is fine; the
// OpenAI usage limit is the real ceiling. One unit ≈ one prayer-request served
// by the LLM (its bounded retries don't each cost a unit).
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
  return aiConfig().dailyLimit - budget.count;
}
function noteLlmCall() {
  rollDay();
  budget.count += 1;
}

// Circuit breaker — once a bad key / exhausted quota is seen, stop calling for a
// cooldown so we don't hammer a dead key. While open, requests use the fallback.
const BREAKER_MS = 30 * 60_000;
let breakerUntil = 0;
const breakerOpen = () => Date.now() < breakerUntil;
const tripBreaker = () => {
  breakerUntil = Date.now() + BREAKER_MS;
};

// Is a live LLM call permitted right now? (key present, breaker closed, budget left)
function aiAvailable() {
  return Boolean(aiConfig().apiKey) && !breakerOpen() && budgetRemaining() > 0;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
function isQuotaError(err) {
  const e = err && err.response && err.response.data && err.response.data.error;
  return /insufficient_quota|billing|quota/i.test(String((e && (e.code || e.type)) || ""));
}

// Split the model's reply into reference strings ("John 16:33; Phil 4:13" →
// ["John 16:33", "Phil 4:13"]). Strips list bullets/enumerators but preserves the
// leading number of books like "1 Corinthians". Resolution + validation happen
// later against the real corpus, so junk lines simply fail to resolve.
function parseReferenceList(reply) {
  return String(reply || "")
    .split(/[;\n]+/)
    .map((s) =>
      s
        .trim()
        .replace(/^[-*•]\s*/, "") // bullet
        .replace(/^\d+[.)]\s+/, "") // "1. " / "2) " enumerator (not "1 Corinthians")
        .trim()
    )
    .filter(Boolean)
    .slice(0, 6);
}

// One OpenAI-compatible /chat/completions call → an array of reference strings the
// model chose. Never trusted for scripture TEXT — only the references; we fetch
// the words from API.Bible.
async function callProvider(request, cfg) {
  const { data } = await axios.post(
    `${cfg.baseUrl}/chat/completions`,
    {
      model: cfg.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Request: "${request}"` },
      ],
      temperature: 0.3,
      max_tokens: AI_DEFAULTS.maxOutputTokens,
    },
    {
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
      timeout: cfg.timeoutMs,
    }
  );
  return parseReferenceList(data?.choices?.[0]?.message?.content || "");
}

// Default provider client with cost guardrails: capped retries on transient
// errors, and an immediate circuit-break (no retry) on a bad key / exhausted
// quota. Works with OpenAI, Groq, OpenRouter, … by swapping AI_BASE_URL/MODEL/KEY.
async function defaultLlmRank(request) {
  const cfg = aiConfig();
  if (!cfg.apiKey) throw new Error("AI disabled (no AI_API_KEY)");

  let attempt = 0;
  for (;;) {
    try {
      return await callProvider(request, cfg);
    } catch (err) {
      const status = err && err.response && err.response.status;
      // Auth/quota: don't retry, and stop calling for a while.
      if (status === 401 || status === 403 || isQuotaError(err)) {
        tripBreaker();
        throw err;
      }
      attempt += 1;
      if (attempt > cfg.maxRetries || !RETRYABLE_STATUS.has(status)) throw err;
      await sleep(250 * attempt); // small linear backoff
    }
  }
}

// Resolve a reference → verbatim text. Prefer API.Bible (the whole Bible); fall
// back to the static seed by reference, so well-known verses still work before the
// Bible key is set (or if API.Bible is briefly down). Never model-authored text.
const refKey = (s) => String(s).toLowerCase().replace(/\s+/g, "");
const SEED_BY_REF = new Map(VERSES.map((v) => [refKey(v.reference), v]));
async function resolveReference(ref) {
  const viaApi = await bibleApi.getPassage(ref);
  if (viaApi) return viaApi;
  const parsed = parseReference(ref);
  const seed = SEED_BY_REF.get(refKey(parsed ? parsed.reference : ref));
  return seed
    ? { id: seed.id, reference: seed.reference, text: seed.text, themes: seed.themes }
    : null;
}

// Core logic (no Express) so it's unit-testable. `deps.llmRank` lets tests inject
// a mock provider; in production it defaults to the OpenAI-compatible client.
async function recommendVerses({ request, theme } = {}, deps = {}) {
  const text = String(request || "").trim();

  // Safety first: never feed a crisis message to the model; redirect with care.
  if (CRISIS_PATTERN.test(text)) {
    const comfort = buildCandidates(["peace", "rest"]);
    return {
      verses: shape(comfort),
      matchedThemes: ["peace", "rest"],
      source: "safety",
      support: SUPPORT_MESSAGE,
    };
  }

  let themes = detectThemes(text);
  // An explicit theme hint (e.g. the active Mode's theme) leads the ranking.
  if (theme && THEMES.includes(theme)) {
    themes = [theme, ...themes.filter((t) => t !== theme)];
  }
  const usedThemes = themes.length ? themes : DEFAULT_THEMES;
  // Keyword-themed seed verses power the no-LLM / no-API fallback (the best we can
  // do without the whole Bible).
  const fallbackCandidates = buildCandidates(usedThemes);

  // AI path: the model proposes references from the WHOLE Bible (matching the
  // meaning behind the request, not just keywords); we resolve each to verbatim
  // text via API.Bible and keep only those that resolve — so an invented reference
  // is dropped and the text is never the model's. Tests inject `deps.llmRank`
  // (references) and/or `deps.resolve`; in production we only call the model when
  // its guardrails allow it (key, breaker, budget) and spend one unit.
  let picked = null;
  const llmRank = deps.llmRank || defaultLlmRank;
  const resolveRef = deps.resolve || resolveReference;
  const useReal = !deps.llmRank && aiAvailable();
  if (deps.llmRank || useReal) {
    if (useReal) noteLlmCall();
    try {
      const refs = await llmRank(text);
      const resolved = [];
      for (const ref of Array.isArray(refs) ? refs : []) {
        if (resolved.length >= MAX_RESULTS) break;
        const v = await resolveRef(ref);
        if (v && v.text && !resolved.some((r) => r.id === v.id)) resolved.push(v);
      }
      if (resolved.length) picked = resolved;
    } catch {
      picked = null; // provider/API error → graceful fallback
    }
  }

  const chosen = picked || fallbackRank(fallbackCandidates, usedThemes);
  return {
    verses: shape(chosen),
    matchedThemes: usedThemes,
    source: picked ? "llm" : "fallback",
  };
}

// --- Lightweight in-memory rate limit + cache (single Render instance) ---
const RATE = { windowMs: 60_000, max: 20 };
const hits = new Map(); // ip -> { count, resetAt }
function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE.windowMs });
    return false;
  }
  rec.count += 1;
  return rec.count > RATE.max;
}

const CACHE_TTL = 10 * 60_000;
const CACHE_MAX = 500;
const cache = new Map(); // key -> { at, value }
function cacheKey(request, theme) {
  return `${theme || ""}::${request.toLowerCase().replace(/\s+/g, " ").trim()}`;
}

// Test helper: clear the limiter + cache + AI budget/breaker so suites don't leak
// state into each other.
function _resetState() {
  hits.clear();
  cache.clear();
  budget.day = "";
  budget.count = 0;
  breakerUntil = 0;
}

// POST /api/verses/recommend  { request: string, theme?: themeSlug }
async function recommendHandler(req, res) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests. Please slow down a moment." });
  }

  const body = req.body || {};
  const request = body.request;
  if (typeof request !== "string" || !request.trim()) {
    return res.status(400).json({ error: "A 'request' string is required." });
  }
  if (request.length > MAX_REQUEST_LEN) {
    return res
      .status(400)
      .json({ error: `'request' must be ${MAX_REQUEST_LEN} characters or fewer.` });
  }
  const { theme } = body;
  if (theme !== undefined && (typeof theme !== "string" || !THEMES.includes(theme))) {
    return res.status(400).json({ error: "unknown theme", themes: THEMES });
  }

  const trimmed = request.trim();
  const key = cacheKey(trimmed, theme);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return res.json(cached.value);
  }

  try {
    const result = await recommendVerses({ request: trimmed, theme });
    const payload = { translation: TRANSLATION, ...result };
    if (cache.size >= CACHE_MAX) cache.clear(); // crude bound; fine at this scale
    cache.set(key, { at: Date.now(), value: payload });
    return res.json(payload);
  } catch (err) {
    console.warn("recommend:", err && err.message);
    return res
      .status(500)
      .json({ error: "Could not find verses right now. Please try again." });
  }
}

module.exports = {
  THEME_KEYWORDS,
  CRISIS_PATTERN,
  SUPPORT_MESSAGE,
  SYSTEM_PROMPT,
  MAX_REQUEST_LEN,
  detectThemes,
  buildCandidates,
  fallbackRank,
  parseReferenceList,
  resolveReference,
  aiConfig,
  aiAvailable,
  budgetRemaining,
  noteLlmCall,
  breakerOpen,
  tripBreaker,
  isQuotaError,
  defaultLlmRank,
  recommendVerses,
  recommendHandler,
  _resetState,
};
