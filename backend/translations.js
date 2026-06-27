// Bible translations offered in the app (Phase 9.1). Each maps a short code to an
// API.Bible bibleId. `pd` = public domain → its text may be cached; licensed ones
// (NIV/NKJV/NLT) must NOT be cached per API.Bible's terms, so we resolve those
// fresh per request (see bibleApi.js). All ids are accessible to the configured
// API.Bible key; edit this list to match the bibles your key/plan includes.
const TRANSLATIONS = [
  { abbr: "WEB", name: "World English Bible", id: "9879dbb7cfe39e4d-04", pd: true },
  { abbr: "KJV", name: "King James Version", id: "de4e12af7f28f599-01", pd: true },
  { abbr: "ASV", name: "American Standard Version", id: "06125adad2d5898a-01", pd: true },
  { abbr: "NIV", name: "New International Version", id: "78a9f6124f344018-01", pd: false },
  { abbr: "NKJV", name: "New King James Version", id: "63097d2a0a2f7db3-01", pd: false },
  { abbr: "NLT", name: "New Living Translation", id: "d6e14a625393b4da-01", pd: false },
];

const DEFAULT_ABBR = "WEB";
const BY_ABBR = new Map(TRANSLATIONS.map((t) => [t.abbr.toUpperCase(), t]));
const BY_ID = new Map(TRANSLATIONS.map((t) => [t.id, t]));

// Resolve a requested translation (abbr like "NIV", case-insensitive, or a raw
// bibleId) → the translation entry. Falls back to the default (WEB).
function resolveTranslation(input) {
  if (!input) return BY_ABBR.get(DEFAULT_ABBR);
  const s = String(input).trim();
  return BY_ABBR.get(s.toUpperCase()) || BY_ID.get(s) || BY_ABBR.get(DEFAULT_ABBR);
}

// The bibleId to call API.Bible with, for a requested translation.
function bibleIdFor(input) {
  return resolveTranslation(input).id;
}

// May we cache this bibleId's text? (public-domain only — licensing/ToS.)
function isCacheableId(id) {
  const t = BY_ID.get(id);
  return Boolean(t && t.pd);
}

// The short label to display/attribute for a bibleId.
function abbrForId(id) {
  const t = BY_ID.get(id);
  return t ? t.abbr : "";
}

// Public list for the client's translation picker.
function listTranslations() {
  return TRANSLATIONS.map(({ abbr, name }) => ({ abbr, name }));
}

module.exports = {
  TRANSLATIONS,
  DEFAULT_ABBR,
  resolveTranslation,
  bibleIdFor,
  isCacheableId,
  abbrForId,
  listTranslations,
};
