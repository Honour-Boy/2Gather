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
const curationStore = require("./dailyCurationStore");

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

// The day's reference list for a kind ("theme" | "votd") + theme: in-memory cache
// → Firestore (survives restarts, shared across instances) → a fresh AI call (then
// persisted). Returns refs or null. `spend` (the budget counter) and the AI call
// happen ONLY on a full miss, so re-entering a theme — or a restart — costs nothing.
async function dayRefs(kind, theme, ask, spend, store, canGen) {
  const day = utcDay();
  const cacheKey = `${kind}:${theme || "general"}:${day}`;
  const mem = kind === "votd" ? votdRefCache : themeRefCache;
  if (mem.has(cacheKey)) return mem.get(cacheKey);

  const stored = await store.getSet(kind, theme, day);
  if (stored) {
    mem.set(cacheKey, stored);
    return stored;
  }
  if (!canGen) return null;

  if (spend) spend();
  try {
    const prompt =
      kind === "votd"
        ? `Name ONE real Bible verse ${scope(theme)} as a verse of the day. Reply with ONLY the reference (e.g. "Psalm 46:1").`
        : `Name 12 real Bible verses ${scope(theme)}. Reply with ONLY the references separated by semicolons (e.g. "Psalm 23:1; John 14:27").`;
    const refs = await ask(CURATE_SYS, prompt, kind === "votd" ? 24 : 260);
    if (Array.isArray(refs) && refs.length) {
      const keep = kind === "votd" ? refs.slice(0, 1) : refs;
      mem.set(cacheKey, keep);
      await store.saveSet(kind, theme, day, keep);
      return keep;
    }
  } catch {
    /* fall through */
  }
  return null;
}

// Resolve reference strings → verbatim verses (capped, deduped) in a translation.
// Resolves in parallel (a few extra in case some refs don't resolve), then keeps
// the first `cap` unique ones in order — much faster than serial fetches.
async function resolveMany(refs, cap, theme, resolve) {
  const list = (Array.isArray(refs) ? refs : []).slice(0, cap + 4);
  const resolved = await Promise.all(list.map((r) => resolve(r).catch(() => null)));
  const out = [];
  const seen = new Set();
  for (const v of resolved) {
    if (out.length >= cap) break;
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
  const spend = opts.spend || (opts.ask ? null : noteLlmCall);
  const store = opts.store || curationStore;
  const canGen = opts.ask ? true : canCurate();

  // Today's set: memory → DB → fresh AI (persisted).
  const refs = await dayRefs("theme", theme, ask, spend, store, canGen);
  if (refs) {
    const verses = await resolveMany(refs, 12, theme, resolve);
    if (verses.length >= 2) return verses;
  }
  // Fallback: a recent prior day's set from the store (real curated verses, better
  // than the static seed).
  const prior = await store.getRecentPrior("theme", theme, utcDay());
  if (prior) {
    const verses = await resolveMany(prior, 12, theme, resolve);
    if (verses.length >= 1) return verses;
  }
  // Last resort: the bundled seed.
  return theme ? getVersesByTheme(theme) : VERSES;
}

// The verse of the day — AI-picked reference (memory → DB → AI, cached/persisted),
// resolved in the chosen translation, then a prior day, then the deterministic seed.
async function getDailyVerse(theme, opts = {}) {
  const ask = opts.ask || askProvider;
  const resolve = opts.resolve || ((r) => bibleApi.getPassage(r, opts.bibleId));
  const spend = opts.spend || (opts.ask ? null : noteLlmCall);
  const store = opts.store || curationStore;
  const canGen = opts.ask ? true : canCurate();

  const refs = await dayRefs("votd", theme, ask, spend, store, canGen);
  if (refs && refs.length) {
    const [verse] = await resolveMany([refs[0]], 1, theme, resolve);
    if (verse) return verse;
  }
  const prior = await store.getRecentPrior("votd", theme, utcDay());
  if (prior && prior.length) {
    const [verse] = await resolveMany([prior[0]], 1, theme, resolve);
    if (verse) return verse;
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
