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
const { THEMES, TRANSLATION, getVersesByTheme } = require("./verses");

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

// Shape a verse for the API response (always from our data — accurate + attributed).
function shape(list) {
  return list
    .slice(0, MAX_RESULTS)
    .map((v) => ({ id: v.id, reference: v.reference, text: v.text, themes: v.themes }));
}

function llmEnabled() {
  return Boolean(process.env.AI_API_KEY);
}

// Default provider client — OpenAI-compatible /chat/completions (works with
// OpenAI, Groq, OpenRouter, … by swapping AI_BASE_URL + AI_MODEL + AI_API_KEY).
// Returns an array of candidate ids the model selected (⊆ the ones we supplied).
// Never trusted for scripture text: we only parse the numbers it replies with.
async function defaultLlmRank(request, candidates) {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new Error("AI disabled (no AI_API_KEY)");
  const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  const numbered = candidates
    .map((c, i) => `${i + 1}. ${c.reference}: "${c.text}"`)
    .join("\n");
  const system =
    "You help match Bible verses to what a person is praying about. From the " +
    "NUMBERED candidate verses below, choose the 1-3 that best fit the request. " +
    'Reply with ONLY their numbers separated by commas (e.g. "2, 5"). Do not ' +
    "write a prayer, do not quote or invent any other scripture, do not add commentary.";
  const user = `Request: "${request}"\nCandidates:\n${numbered}`;

  const { data } = await axios.post(
    `${baseUrl}/chat/completions`,
    {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: 20,
    },
    {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      timeout: 8000,
    }
  );

  const reply = data?.choices?.[0]?.message?.content || "";
  // Map the reply's 1-based numbers back to candidate ids; ignore anything else.
  const ids = [];
  for (const n of reply.match(/\d+/g) || []) {
    const c = candidates[parseInt(n, 10) - 1];
    if (c && !ids.includes(c.id)) ids.push(c.id);
  }
  return ids;
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
  const candidates = buildCandidates(usedThemes);

  // Optional LLM ranking, strictly constrained to the candidate ids we supplied.
  let picked = null;
  const llmRank = deps.llmRank || defaultLlmRank;
  if (deps.llmRank || llmEnabled()) {
    try {
      const ids = await llmRank(text, candidates);
      const allowed = new Set(candidates.map((c) => c.id));
      const byId = new Map(candidates.map((c) => [c.id, c]));
      const valid = (Array.isArray(ids) ? ids : [])
        .filter((id) => allowed.has(id))
        .slice(0, MAX_RESULTS);
      if (valid.length) picked = valid.map((id) => byId.get(id));
    } catch {
      picked = null; // provider error / over quota → graceful fallback
    }
  }

  const chosen = picked || fallbackRank(candidates, usedThemes);
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

// Test helper: clear the limiter + cache so suites don't leak state into each other.
function _resetState() {
  hits.clear();
  cache.clear();
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
  MAX_REQUEST_LEN,
  detectThemes,
  buildCandidates,
  fallbackRank,
  llmEnabled,
  defaultLlmRank,
  recommendVerses,
  recommendHandler,
  _resetState,
};
