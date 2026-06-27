// AI-curated, whole-Bible verse content (Phase 9, part 2). The themed verse sets
// and the verse of the day are no longer the static 25 — the AI proposes fresh
// references each UTC-day and API.Bible supplies the verbatim text. Search runs
// over the whole Bible via API.Bible. Everything falls back to the static seed
// (backend/verses.js) when AI / API.Bible is unavailable, so the app never breaks.
//
// Same grounding guarantee as the recommender: the model only NAMES references;
// the words always come from an authoritative source, never the model.

const {
  THEMES,
  THEME_LABELS,
  TRANSLATION,
  VERSES,
  getVersesByTheme,
  getDailyVerse: seedDailyVerse,
  searchVerses: seedSearch,
} = require("./verses");
const bibleApi = require("./bibleApi");
const { askProvider, aiAvailable, noteLlmCall } = require("./verseRecommend");

const utcDay = () => new Date().toISOString().slice(0, 10);

// What each theme is "about" — steers the curation prompt.
const GUIDANCE = {
  "journey-and-trust": "trusting God through travel, transitions, decisions, and uncertainty",
  courage: "courage and strength to face fear, challenges, interviews, or bold steps",
  rest: "rest, comfort, and restoration for the weary, burned out, or burdened",
  gratitude: "thankfulness and praise for God's goodness and provision",
  peace: "peace and calm for anxiety, worry, stress, and troubled hearts",
};
function scope(theme) {
  return theme && GUIDANCE[theme]
    ? `about ${GUIDANCE[theme]}`
    : "that are uplifting and encouraging — a varied mix from across the whole Bible";
}

const CURATE_SYS =
  "You curate real Bible verses by topic. You only NAME references (book chapter:verse) " +
  "drawn from anywhere in the Bible — never quote the text or add commentary.";

// In-memory, per-UTC-day caches (lazily regenerated on the first request of a new
// day). Keyed by `${theme||'general'}:${day}`.
const themeCache = new Map();
const votdCache = new Map();

// Resolve reference strings → verbatim verses (capped, deduped). `resolve` is
// injectable for tests; defaults to API.Bible.
async function resolveMany(refs, cap, theme, resolve) {
  const out = [];
  const seen = new Set();
  for (const ref of Array.isArray(refs) ? refs : []) {
    if (out.length >= cap) break;
    const v = await resolve(ref);
    if (v && v.text && !seen.has(v.id)) {
      seen.add(v.id);
      out.push({ id: v.id, reference: v.reference, text: v.text, themes: theme ? [theme] : [] });
    }
  }
  return out;
}

// Can we curate live right now? (AI key + breaker + budget AND API.Bible enabled)
function canCurate() {
  return aiAvailable() && bibleApi.bibleEnabled();
}

// A theme's verse set — AI-curated + cached for the day, or the static seed.
// `deps.ask` / `deps.resolve` let tests inject without hitting the network.
async function getThemeVerses(theme, deps = {}) {
  const key = `${theme || "general"}:${utcDay()}`;
  const cached = themeCache.get(key);
  if (cached) return cached;

  const ask = deps.ask || askProvider;
  const resolve = deps.resolve || bibleApi.getPassage;
  if (deps.ask || canCurate()) {
    if (!deps.ask) noteLlmCall();
    try {
      const refs = await ask(
        CURATE_SYS,
        `Name 12 real Bible verses ${scope(theme)}. Reply with ONLY the references separated by semicolons (e.g. "Psalm 23:1; John 14:27").`,
        260
      );
      const verses = await resolveMany(refs, 12, theme, resolve);
      if (verses.length >= 2) {
        themeCache.set(key, verses);
        return verses;
      }
    } catch {
      /* fall through to seed */
    }
  }
  return theme ? getVersesByTheme(theme) : VERSES;
}

// The verse of the day — AI-picked + cached for the day, or the deterministic seed.
async function getDailyVerse(theme, deps = {}) {
  const key = `${theme || "general"}:${utcDay()}`;
  const cached = votdCache.get(key);
  if (cached) return cached;

  const ask = deps.ask || askProvider;
  const resolve = deps.resolve || bibleApi.getPassage;
  if (deps.ask || canCurate()) {
    if (!deps.ask) noteLlmCall();
    try {
      const refs = await ask(
        CURATE_SYS,
        `Name ONE real Bible verse ${scope(theme)} as a verse of the day. Reply with ONLY the reference (e.g. "Psalm 46:1").`,
        24
      );
      const verses = await resolveMany(refs, 1, theme, resolve);
      if (verses.length) {
        votdCache.set(key, verses[0]);
        return verses[0];
      }
    } catch {
      /* fall through to seed */
    }
  }
  return seedDailyVerse(utcDay(), theme);
}

// Whole-Bible keyword search via API.Bible, or the static-seed search as fallback.
async function searchVerses(query, deps = {}) {
  const q = String(query || "").trim();
  if (!q) return [];
  const search = deps.search || bibleApi.searchBible;
  if (deps.search || bibleApi.bibleEnabled()) {
    try {
      const results = await search(q, 24);
      if (Array.isArray(results) && results.length) {
        return results.map((v) => ({ id: v.id, reference: v.reference, text: v.text, themes: [] }));
      }
    } catch {
      /* fall through to seed */
    }
  }
  return seedSearch(q);
}

// --- Express handlers (drop-in replacements for the verses.js ones) ---

// GET /api/verses?theme=courage  — the theme's curated set (or a general mix).
async function versesHandler(req, res) {
  const { theme } = req.query;
  if (theme && !THEMES.includes(theme)) {
    return res.status(400).json({ error: "unknown theme", themes: THEMES });
  }
  let verses;
  try {
    verses = await getThemeVerses(theme || null);
  } catch {
    verses = theme ? getVersesByTheme(theme) : VERSES;
  }
  res.set("Cache-Control", "public, max-age=3600");
  return res.json({ translation: TRANSLATION, themes: THEME_LABELS, count: verses.length, verses });
}

// GET /api/verses/daily?theme=rest  — the (cached) verse of the day.
async function dailyVerseHandler(req, res) {
  const { theme } = req.query;
  if (theme && !THEMES.includes(theme)) {
    return res.status(400).json({ error: "unknown theme", themes: THEMES });
  }
  let verse;
  try {
    verse = await getDailyVerse(theme || null);
  } catch {
    verse = seedDailyVerse(utcDay(), theme);
  }
  res.set("Cache-Control", "public, max-age=3600");
  return res.json({ translation: TRANSLATION, theme: theme || null, verse });
}

// GET /api/verses/search?q=love  — whole-Bible search.
async function searchVersesHandler(req, res) {
  const q = req.query.q;
  if (!q || !String(q).trim()) {
    return res.status(400).json({ error: "query parameter 'q' is required" });
  }
  let verses;
  try {
    verses = await searchVerses(q);
  } catch {
    verses = seedSearch(q);
  }
  return res.json({ translation: TRANSLATION, query: String(q).trim(), count: verses.length, verses });
}

function _resetState() {
  themeCache.clear();
  votdCache.clear();
}

module.exports = {
  getThemeVerses,
  getDailyVerse,
  searchVerses,
  versesHandler,
  dailyVerseHandler,
  searchVersesHandler,
  _resetState,
};
