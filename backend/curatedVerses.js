// AI-curated, whole-Bible verse content (Phase 9, part 2 + translations). Themed
// verse sets and the verse of the day are AI-curated — the model proposes
// REFERENCES once per UTC-day (cached, translation-independent), and API.Bible
// supplies verbatim text in the user's chosen translation. Search runs over the
// whole Bible. Everything falls back to the static seed (backend/verses.js) when
// AI / API.Bible is unavailable, so the app never breaks.
//
// Same grounding guarantee as the recommender: the model only NAMES references;
// the words always come from an authoritative source, never the model. Caching
// only the references (not text) keeps licensed translations ToS-compliant.

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

// Per-UTC-day caches of the AI's chosen REFERENCES (not text — translation-
// independent + ToS-safe). Keyed by `${theme||'general'}:${day}`.
const themeRefCache = new Map();
const votdRefCache = new Map();

// Can we curate live right now? (AI key + breaker + budget AND API.Bible enabled)
function canCurate() {
  return aiAvailable() && bibleApi.bibleEnabled();
}

// Get the day's reference list for a theme (cached → no repeat AI call), or null.
// `spend` (the budget counter) is called ONLY when an actual AI call happens —
// i.e. on a cache miss — so re-entering a theme costs nothing.
async function themeRefs(theme, ask, spend) {
  const key = `${theme || "general"}:${utcDay()}`;
  const cached = themeRefCache.get(key);
  if (cached) return cached;
  if (spend) spend();
  try {
    const refs = await ask(
      CURATE_SYS,
      `Name 12 real Bible verses ${scope(theme)}. Reply with ONLY the references separated by semicolons (e.g. "Psalm 23:1; John 14:27").`,
      260
    );
    if (Array.isArray(refs) && refs.length) {
      themeRefCache.set(key, refs);
      return refs;
    }
  } catch {
    /* fall through */
  }
  return null;
}

// Resolve reference strings → verbatim verses (capped, deduped) in a translation.
async function resolveMany(refs, cap, theme, resolve) {
  const out = [];
  const seen = new Set();
  for (const ref of Array.isArray(refs) ? refs : []) {
    if (out.length >= cap) break;
    const v = await resolve(ref);
    if (v && v.text && !seen.has(v.id)) {
      seen.add(v.id);
      out.push({
        id: v.id,
        reference: v.reference,
        text: v.text,
        themes: theme ? [theme] : [],
        ...(v.translation ? { translation: v.translation } : {}),
      });
    }
  }
  return out;
}

// A theme's verse set — AI-curated references (cached daily) resolved in the chosen
// translation, or the static seed. `opts.bibleId` picks the translation;
// `opts.ask` / `opts.resolve` let tests inject without the network.
async function getThemeVerses(theme, opts = {}) {
  const ask = opts.ask || askProvider;
  const resolve = opts.resolve || ((r) => bibleApi.getPassage(r, opts.bibleId));
  // Spend a budget unit only on a real AI call (cache miss); null in tests / when
  // a ranker is injected.
  const spend = opts.spend || (opts.ask ? null : noteLlmCall);
  if (opts.ask || canCurate()) {
    const refs = await themeRefs(theme, ask, spend);
    if (refs) {
      const verses = await resolveMany(refs, 12, theme, resolve);
      if (verses.length >= 2) return verses;
    }
  }
  return theme ? getVersesByTheme(theme) : VERSES;
}

// The verse of the day — AI-picked reference (cached daily) resolved in the chosen
// translation, or the deterministic seed.
async function getDailyVerse(theme, opts = {}) {
  const ask = opts.ask || askProvider;
  const resolve = opts.resolve || ((r) => bibleApi.getPassage(r, opts.bibleId));
  const key = `${theme || "general"}:${utcDay()}`;

  if (opts.ask || canCurate()) {
    let ref = votdRefCache.get(key);
    if (!ref) {
      if (!opts.ask) noteLlmCall();
      try {
        const refs = await ask(
          CURATE_SYS,
          `Name ONE real Bible verse ${scope(theme)} as a verse of the day. Reply with ONLY the reference (e.g. "Psalm 46:1").`,
          24
        );
        ref = Array.isArray(refs) && refs.length ? refs[0] : null;
        if (ref) votdRefCache.set(key, ref);
      } catch {
        ref = null;
      }
    }
    if (ref) {
      const [verse] = await resolveMany([ref], 1, theme, resolve);
      if (verse) return verse;
    }
  }
  return seedDailyVerse(utcDay(), theme);
}

// Whole-Bible keyword search (in a translation) via API.Bible, or seed-search fallback.
async function searchVerses(query, opts = {}) {
  const q = String(query || "").trim();
  if (!q) return [];
  const search = opts.search || ((s, limit) => bibleApi.searchBible(s, limit, opts.bibleId));
  if (opts.search || bibleApi.bibleEnabled()) {
    try {
      const results = await search(q, 24);
      if (Array.isArray(results) && results.length) {
        return results.map((v) => ({
          id: v.id,
          reference: v.reference,
          text: v.text,
          themes: [],
          ...(v.translation ? { translation: v.translation } : {}),
        }));
      }
    } catch {
      /* fall through */
    }
  }
  return seedSearch(q);
}

// --- Express handlers (drop-in replacements for the verses.js ones) ---
const { bibleIdFor } = require("./translations");

// GET /api/verses?theme=courage&translation=NIV  — the theme's curated set.
async function versesHandler(req, res) {
  const { theme, translation } = req.query;
  if (theme && !THEMES.includes(theme)) {
    return res.status(400).json({ error: "unknown theme", themes: THEMES });
  }
  let verses;
  try {
    verses = await getThemeVerses(theme || null, { bibleId: bibleIdFor(translation) });
  } catch {
    verses = theme ? getVersesByTheme(theme) : VERSES;
  }
  res.set("Cache-Control", "public, max-age=3600");
  return res.json({ translation: TRANSLATION, themes: THEME_LABELS, count: verses.length, verses });
}

// GET /api/verses/daily?theme=rest&translation=NIV  — the (cached) verse of the day.
async function dailyVerseHandler(req, res) {
  const { theme, translation } = req.query;
  if (theme && !THEMES.includes(theme)) {
    return res.status(400).json({ error: "unknown theme", themes: THEMES });
  }
  let verse;
  try {
    verse = await getDailyVerse(theme || null, { bibleId: bibleIdFor(translation) });
  } catch {
    verse = seedDailyVerse(utcDay(), theme);
  }
  res.set("Cache-Control", "public, max-age=3600");
  return res.json({ translation: TRANSLATION, theme: theme || null, verse });
}

// GET /api/verses/search?q=love&translation=NIV  — whole-Bible search.
async function searchVersesHandler(req, res) {
  const q = req.query.q;
  if (!q || !String(q).trim()) {
    return res.status(400).json({ error: "query parameter 'q' is required" });
  }
  let verses;
  try {
    verses = await searchVerses(q, { bibleId: bibleIdFor(req.query.translation) });
  } catch {
    verses = seedSearch(q);
  }
  return res.json({ translation: TRANSLATION, query: String(q).trim(), count: verses.length, verses });
}

function _resetState() {
  themeRefCache.clear();
  votdRefCache.clear();
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
