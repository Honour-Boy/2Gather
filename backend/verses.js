// Bible Verse Engine (Phase 3). Pure data + logic — no Firebase, no I/O — so it
// imports cleanly in tests (CI has no credentials) and is trivially cacheable.
//
// Translation: World English Bible (WEB), public domain. This is a curated SEED
// set chosen for the 2Gather themes; verify wording against a canonical WEB
// source before production and expand as needed. Never paraphrase scripture —
// store the attributed translation text verbatim.

const TRANSLATION = "WEB";

// Theme slugs map to the app's life-situation Modes (see docs/plan/phase-4).
const THEME_LABELS = {
  "journey-and-trust": "Journey & Trust",
  courage: "Courage",
  rest: "Rest",
  gratitude: "Gratitude",
  peace: "Peace",
};
const THEMES = Object.keys(THEME_LABELS);

// id is stable (used as a React key / for sharing). themes[] lets one verse
// surface under multiple categories.
const VERSES = [
  // --- Journey & Trust (Travel mode) ---
  { id: "pro-3-5-6", reference: "Proverbs 3:5-6", themes: ["journey-and-trust"],
    text: "Trust in Yahweh with all your heart, and don’t lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight." },
  { id: "isa-41-10", reference: "Isaiah 41:10", themes: ["journey-and-trust", "courage"],
    text: "Don’t you be afraid, for I am with you. Don’t be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness." },
  { id: "psa-121-8", reference: "Psalm 121:8", themes: ["journey-and-trust"],
    text: "Yahweh will keep your going out and your coming in, from this time forward, and forever more." },
  { id: "jos-1-9", reference: "Joshua 1:9", themes: ["journey-and-trust", "courage"],
    text: "Haven’t I commanded you? Be strong and courageous. Don’t be afraid. Don’t be dismayed, for Yahweh your God is with you wherever you go." },
  { id: "psa-23-4", reference: "Psalm 23:4", themes: ["journey-and-trust", "peace"],
    text: "Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me." },

  // --- Courage (Interview / Pitch modes) ---
  { id: "deu-31-6", reference: "Deuteronomy 31:6", themes: ["courage"],
    text: "Be strong and courageous. Don’t be afraid or scared of them; for Yahweh your God himself is who goes with you. He will not fail you nor forsake you." },
  { id: "2ti-1-7", reference: "2 Timothy 1:7", themes: ["courage"],
    text: "For God didn’t give us a spirit of fear, but of power, love, and self-control." },
  { id: "psa-27-1", reference: "Psalm 27:1", themes: ["courage", "peace"],
    text: "Yahweh is my light and my salvation. Whom shall I fear? Yahweh is the strength of my life. Of whom shall I be afraid?" },
  { id: "phi-4-13", reference: "Philippians 4:13", themes: ["courage"],
    text: "I can do all things through Christ, who strengthens me." },
  { id: "1co-16-13", reference: "1 Corinthians 16:13", themes: ["courage"],
    text: "Watch! Stand firm in the faith! Be courageous! Be strong!" },

  // --- Rest (Downtime & Recovery mode) ---
  { id: "mat-11-28", reference: "Matthew 11:28", themes: ["rest"],
    text: "Come to me, all you who labor and are heavily burdened, and I will give you rest." },
  { id: "psa-46-10", reference: "Psalm 46:10", themes: ["rest", "peace"],
    text: "Be still, and know that I am God. I will be exalted among the nations. I will be exalted in the earth." },
  { id: "psa-4-8", reference: "Psalm 4:8", themes: ["rest", "peace"],
    text: "In peace I will both lay myself down and sleep, for you, Yahweh alone, make me live in safety." },
  { id: "exo-33-14", reference: "Exodus 33:14", themes: ["rest"],
    text: "He said, “My presence will go with you, and I will give you rest.”" },
  { id: "psa-23-2-3", reference: "Psalm 23:2-3", themes: ["rest"],
    text: "He makes me lie down in green pastures. He leads me beside still waters. He restores my soul." },

  // --- Gratitude (Promotion & Opportunity mode) ---
  { id: "1th-5-18", reference: "1 Thessalonians 5:18", themes: ["gratitude"],
    text: "In everything give thanks, for this is the will of God in Christ Jesus toward you." },
  { id: "psa-100-4", reference: "Psalm 100:4", themes: ["gratitude"],
    text: "Enter into his gates with thanksgiving, and into his courts with praise. Give thanks to him, and bless his name." },
  { id: "psa-107-1", reference: "Psalm 107:1", themes: ["gratitude"],
    text: "Give thanks to Yahweh, for he is good, for his loving kindness endures forever." },
  { id: "col-3-17", reference: "Colossians 3:17", themes: ["gratitude"],
    text: "Whatever you do, in word or in deed, do all in the name of the Lord Jesus, giving thanks to God the Father through him." },
  { id: "jam-1-17", reference: "James 1:17", themes: ["gratitude"],
    text: "Every good gift and every perfect gift is from above, coming down from the Father of lights, with whom can be no variation, nor turning shadow." },

  // --- Peace ---
  { id: "joh-14-27", reference: "John 14:27", themes: ["peace"],
    text: "Peace I leave with you. My peace I give to you; not as the world gives, I give to you. Don’t let your heart be troubled, neither let it be fearful." },
  { id: "phi-4-6-7", reference: "Philippians 4:6-7", themes: ["peace", "gratitude"],
    text: "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus." },
  { id: "isa-26-3", reference: "Isaiah 26:3", themes: ["peace"],
    text: "You will keep whoever’s mind is steadfast in perfect peace, because he trusts in you." },
  { id: "joh-16-33", reference: "John 16:33", themes: ["peace", "courage"],
    text: "I have told you these things, that in me you may have peace. In the world you have trouble; but cheer up! I have overcome the world." },
  { id: "psa-29-11", reference: "Psalm 29:11", themes: ["peace"],
    text: "Yahweh will give strength to his people. Yahweh will bless his people with peace." },
];

function getVersesByTheme(theme) {
  return VERSES.filter((v) => v.themes.includes(theme));
}

// Deterministic day index so the "verse of the day" is stable within a UTC day
// and rotates across days. Falls back to today on a missing/invalid date.
function dayNumber(dateStr) {
  let ms = dateStr ? Date.parse(`${dateStr}T00:00:00Z`) : Date.now();
  if (Number.isNaN(ms)) ms = Date.now();
  return Math.floor(ms / 86_400_000);
}

function getDailyVerse(dateStr, theme) {
  const pool = theme ? getVersesByTheme(theme) : VERSES;
  if (pool.length === 0) return null;
  const idx = ((dayNumber(dateStr) % pool.length) + pool.length) % pool.length;
  return pool[idx];
}

function searchVerses(q) {
  const needle = String(q || "").trim().toLowerCase();
  if (!needle) return [];
  return VERSES.filter(
    (v) =>
      v.text.toLowerCase().includes(needle) ||
      v.reference.toLowerCase().includes(needle)
  );
}

// --- Express handlers ---

// GET /api/verses?theme=courage
function versesHandler(req, res) {
  const { theme } = req.query;
  if (theme && !THEMES.includes(theme)) {
    return res.status(400).json({ error: "unknown theme", themes: THEMES });
  }
  const verses = theme ? getVersesByTheme(theme) : VERSES;
  res.set("Cache-Control", "public, max-age=86400");
  return res.json({ translation: TRANSLATION, themes: THEME_LABELS, count: verses.length, verses });
}

// GET /api/verses/daily?theme=rest&date=YYYY-MM-DD
function dailyVerseHandler(req, res) {
  const { theme, date } = req.query;
  if (theme && !THEMES.includes(theme)) {
    return res.status(400).json({ error: "unknown theme", themes: THEMES });
  }
  const verse = getDailyVerse(date, theme);
  res.set("Cache-Control", "public, max-age=3600");
  return res.json({ translation: TRANSLATION, theme: theme || null, verse });
}

// GET /api/verses/search?q=peace
function searchVersesHandler(req, res) {
  const q = req.query.q;
  if (!q || !String(q).trim()) {
    return res.status(400).json({ error: "query parameter 'q' is required" });
  }
  const verses = searchVerses(q);
  return res.json({ translation: TRANSLATION, query: String(q).trim(), count: verses.length, verses });
}

module.exports = {
  TRANSLATION,
  THEMES,
  THEME_LABELS,
  VERSES,
  getVersesByTheme,
  getDailyVerse,
  searchVerses,
  versesHandler,
  dailyVerseHandler,
  searchVersesHandler,
};
