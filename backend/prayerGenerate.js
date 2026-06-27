// AI prayer-template generation (opt-in; the client only calls this when the user
// has enabled AI in settings). Given a topic and/or theme, generate a short,
// reverent STARTER prayer that the user reads, edits, and prays in their own words.
//
// Faith-content rules (see CLAUDE.md): the model writes the prayer PROSE, but
// scripture stays REAL — any suggested verse comes from our own corpus (verbatim,
// attributed), never quoted by the model. Degrades gracefully: with no AI key (or
// over budget / breaker open) it returns a curated template for the theme. A
// crisis topic is redirected with care (never sent to the model).

const {
  askProviderText,
  aiAvailable,
  noteLlmCall,
  detectThemes,
  CRISIS_PATTERN,
  SUPPORT_MESSAGE,
} = require("./verseRecommend");
const { THEMES, TRANSLATION, getVersesByTheme } = require("./verses");
const { getTemplatesByTheme, PRAYER_TEMPLATES } = require("./prayerTemplates");

const MAX_TOPIC_LEN = 300;

const PRAYER_SYSTEM_PROMPT =
  "You write a short, reverent Christian STARTER prayer for what the person is " +
  "facing — something they will read, edit, and pray in their own words. 2 to 4 " +
  "short sentences, first person (begin with 'Lord,' or 'Father,'), warm, humble " +
  "and hopeful, non-denominational. Do NOT quote or cite Bible verses (a real " +
  "verse is attached separately). No preamble, no headings, no commentary — output " +
  "ONLY the prayer, ending with 'Amen.'";

// A gentle, fixed comfort prayer for crisis inputs (never AI-generated).
const COMFORT_PRAYER =
  "Lord, in this heavy moment I feel overwhelmed, and I bring my whole heart to " +
  "You. Hold me, steady my breathing, and remind me that I am not alone and that " +
  "I am deeply loved. Send help and hope, and people to carry this with me. Amen.";

// One real, attributed verse for a theme (verbatim seed text — never AI-authored).
function themeVerse(theme) {
  const list = (theme && getVersesByTheme(theme)) || [];
  const v = list[0];
  return v ? { reference: v.reference, text: v.text, translation: TRANSLATION } : null;
}

// A curated fallback prayer for a theme (used when AI is off / over budget / errors).
function fallbackPrayer(theme) {
  const tpls = (theme && getTemplatesByTheme(theme)) || [];
  return (tpls[0] || PRAYER_TEMPLATES[0]).body;
}

// Core logic (no Express) so it's unit-testable. `deps.generate(seed)` lets tests
// inject the model; in production we call the guardrailed provider only when AI is
// available (key, breaker closed, budget left) and spend one unit per attempt.
async function generatePrayer({ topic, theme, hasVerse } = {}, deps = {}) {
  const text = String(topic || "").trim();
  const themeSlug = THEMES.includes(theme) ? theme : null;

  // Safety: never feed a crisis message to the model; respond with care.
  if (CRISIS_PATTERN.test(text)) {
    return {
      prayer: COMFORT_PRAYER,
      verse: themeVerse("peace") || themeVerse(THEMES[0]),
      source: "safety",
      support: SUPPORT_MESSAGE,
    };
  }

  const seed = text || (themeSlug ? `the theme of ${themeSlug}` : "today");

  // Generate the prayer prose.
  let prayer = null;
  let source = "fallback";
  if (deps.generate) {
    try {
      prayer = await deps.generate(seed);
      if (prayer) source = "llm";
    } catch {
      prayer = null;
    }
  } else if (aiAvailable()) {
    noteLlmCall(); // a unit ≈ one attempt (mirrors the recommender)
    try {
      prayer = await askProviderText(PRAYER_SYSTEM_PROMPT, `Situation: "${seed}"`, 180);
      if (prayer) source = "llm";
    } catch {
      prayer = null;
    }
  }
  if (!prayer) {
    prayer = fallbackPrayer(themeSlug);
    source = "fallback";
  }

  // Suggest a fitting verse only when the user hasn't already chosen one. Cheap
  // and real: a themed seed verse (no extra AI call) the client lets them confirm.
  const verseTheme = themeSlug || detectThemes(text)[0] || "peace";
  const verse = hasVerse ? null : themeVerse(verseTheme) || themeVerse(THEMES[0]);

  return { prayer, verse, source };
}

// --- Light per-IP rate limit (the shared AI budget is the real ceiling) ---
const RATE = { windowMs: 60_000, max: 15 };
const hits = new Map();
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

// POST /api/prayer-templates/generate  { topic?: string, theme?: slug, hasVerse?: bool }
async function generateHandler(req, res) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests. Please slow down a moment." });
  }

  const body = req.body || {};
  const { topic, theme } = body;
  if (topic !== undefined && typeof topic !== "string") {
    return res.status(400).json({ error: "'topic' must be a string." });
  }
  if (typeof topic === "string" && topic.length > MAX_TOPIC_LEN) {
    return res
      .status(400)
      .json({ error: `'topic' must be ${MAX_TOPIC_LEN} characters or fewer.` });
  }
  if (theme !== undefined && (typeof theme !== "string" || !THEMES.includes(theme))) {
    return res.status(400).json({ error: "unknown theme", themes: THEMES });
  }

  try {
    const result = await generatePrayer({ topic, theme, hasVerse: !!body.hasVerse });
    return res.json(result);
  } catch (err) {
    console.warn("prayer-generate:", err && err.message);
    return res
      .status(500)
      .json({ error: "Could not generate a prayer right now. Please try again." });
  }
}

function _resetState() {
  hits.clear();
}

module.exports = {
  PRAYER_SYSTEM_PROMPT,
  MAX_TOPIC_LEN,
  generatePrayer,
  generateHandler,
  _resetState,
};
