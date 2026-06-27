// Bible reference parser/normalizer (Phase 9). Turns a free-form human reference
// like "John 3:16", "1 Cor 13:4-7", or "Psalm 23" into an API.Bible USFM id
// ("JHN.3.16", "1CO.13.4-1CO.13.7", "PSA.23"). Pure logic — no I/O — so it imports
// cleanly into tests and is trivially cacheable.
//
// The AI proposes references; this maps them to ids we can resolve against
// API.Bible. Anything that doesn't parse to a known book is rejected (null), so a
// hallucinated "book" never reaches the API.

// 66 books → USFM 3-char codes. Keys are normalized (lowercase, single-spaced, no
// dots); we include full names + the common abbreviations an LLM tends to emit.
const BOOK_CODES = {
  // --- Old Testament ---
  genesis: "GEN", gen: "GEN",
  exodus: "EXO", exod: "EXO", exo: "EXO",
  leviticus: "LEV", lev: "LEV",
  numbers: "NUM", num: "NUM",
  deuteronomy: "DEU", deut: "DEU", deu: "DEU",
  joshua: "JOS", josh: "JOS", jos: "JOS",
  judges: "JDG", judg: "JDG", jdg: "JDG",
  ruth: "RUT", rut: "RUT",
  "1 samuel": "1SA", "1 sam": "1SA", "1sa": "1SA",
  "2 samuel": "2SA", "2 sam": "2SA", "2sa": "2SA",
  "1 kings": "1KI", "1 kgs": "1KI", "1ki": "1KI",
  "2 kings": "2KI", "2 kgs": "2KI", "2ki": "2KI",
  "1 chronicles": "1CH", "1 chron": "1CH", "1 chr": "1CH", "1ch": "1CH",
  "2 chronicles": "2CH", "2 chron": "2CH", "2 chr": "2CH", "2ch": "2CH",
  ezra: "EZR", ezr: "EZR",
  nehemiah: "NEH", neh: "NEH",
  esther: "EST", est: "EST",
  job: "JOB",
  psalm: "PSA", psalms: "PSA", psa: "PSA", ps: "PSA", pss: "PSA",
  proverbs: "PRO", prov: "PRO", pro: "PRO",
  ecclesiastes: "ECC", eccles: "ECC", eccl: "ECC", ecc: "ECC", qoh: "ECC",
  "song of solomon": "SNG", "song of songs": "SNG", song: "SNG", sng: "SNG", sos: "SNG",
  isaiah: "ISA", isa: "ISA",
  jeremiah: "JER", jer: "JER",
  lamentations: "LAM", lam: "LAM",
  ezekiel: "EZK", ezek: "EZK", ezk: "EZK",
  daniel: "DAN", dan: "DAN",
  hosea: "HOS", hos: "HOS",
  joel: "JOL", jol: "JOL",
  amos: "AMO", amo: "AMO",
  obadiah: "OBA", obad: "OBA", oba: "OBA",
  jonah: "JON", jon: "JON",
  micah: "MIC", mic: "MIC",
  nahum: "NAM", nah: "NAM", nam: "NAM",
  habakkuk: "HAB", hab: "HAB",
  zephaniah: "ZEP", zeph: "ZEP", zep: "ZEP",
  haggai: "HAG", hag: "HAG",
  zechariah: "ZEC", zech: "ZEC", zec: "ZEC",
  malachi: "MAL", mal: "MAL",
  // --- New Testament ---
  matthew: "MAT", matt: "MAT", mat: "MAT", mt: "MAT",
  mark: "MRK", mrk: "MRK", mk: "MRK",
  luke: "LUK", luk: "LUK", lk: "LUK",
  john: "JHN", jhn: "JHN", jn: "JHN",
  acts: "ACT", act: "ACT",
  romans: "ROM", rom: "ROM",
  "1 corinthians": "1CO", "1 cor": "1CO", "1co": "1CO",
  "2 corinthians": "2CO", "2 cor": "2CO", "2co": "2CO",
  galatians: "GAL", gal: "GAL",
  ephesians: "EPH", eph: "EPH",
  philippians: "PHP", phil: "PHP", php: "PHP",
  colossians: "COL", col: "COL",
  "1 thessalonians": "1TH", "1 thess": "1TH", "1 thes": "1TH", "1th": "1TH",
  "2 thessalonians": "2TH", "2 thess": "2TH", "2 thes": "2TH", "2th": "2TH",
  "1 timothy": "1TI", "1 tim": "1TI", "1ti": "1TI",
  "2 timothy": "2TI", "2 tim": "2TI", "2ti": "2TI",
  titus: "TIT", tit: "TIT",
  philemon: "PHM", philem: "PHM", phlm: "PHM", phm: "PHM",
  hebrews: "HEB", heb: "HEB",
  james: "JAS", jas: "JAS",
  "1 peter": "1PE", "1 pet": "1PE", "1pe": "1PE",
  "2 peter": "2PE", "2 pet": "2PE", "2pe": "2PE",
  "1 john": "1JN", "1 jn": "1JN", "1jn": "1JN",
  "2 john": "2JN", "2 jn": "2JN", "2jn": "2JN",
  "3 john": "3JN", "3 jn": "3JN", "3jn": "3JN",
  jude: "JUD", jud: "JUD",
  revelation: "REV", revelations: "REV", rev: "REV", apocalypse: "REV",
};

// Normalize a book string: lowercase, drop dots, collapse whitespace.
function normalizeBook(s) {
  return String(s).toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
}

function bookToCode(raw) {
  const norm = normalizeBook(raw);
  if (BOOK_CODES[norm]) return BOOK_CODES[norm];
  // Tolerate a missing space between a leading number and the name ("1cor").
  const spaced = norm.replace(/^([1-3])\s*/, "$1 ");
  if (BOOK_CODES[spaced]) return BOOK_CODES[spaced];
  const unspaced = norm.replace(/^([1-3])\s+/, "$1");
  if (BOOK_CODES[unspaced]) return BOOK_CODES[unspaced];
  return null;
}

// Parse "1 Corinthians 13:4-7" → { code, chapter, verse, endVerse, id, reference }.
// Returns null if the book is unknown or the shape is unparseable. `id` is the
// API.Bible USFM id (verse, range, or whole chapter); `reference` is a clean
// human label.
function parseReference(input) {
  const text = String(input || "").trim();
  // book (optional leading 1-3) + chapter + optional :verse + optional -endVerse
  const m = text.match(
    /^\s*([1-3]?\s*[A-Za-z][A-Za-z. ]*?)\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?\s*$/
  );
  if (!m) return null;
  const code = bookToCode(m[1]);
  if (!code) return null;

  const chapter = parseInt(m[2], 10);
  const verse = m[3] ? parseInt(m[3], 10) : null;
  const endVerse = m[4] ? parseInt(m[4], 10) : null;
  if (endVerse !== null && verse !== null && endVerse < verse) return null;

  let id;
  let reference;
  if (verse === null) {
    id = `${code}.${chapter}`;
    reference = `${humanBook(code)} ${chapter}`;
  } else if (endVerse !== null && endVerse !== verse) {
    id = `${code}.${chapter}.${verse}-${code}.${chapter}.${endVerse}`;
    reference = `${humanBook(code)} ${chapter}:${verse}-${endVerse}`;
  } else {
    id = `${code}.${chapter}.${verse}`;
    reference = `${humanBook(code)} ${chapter}:${verse}`;
  }
  return { code, chapter, verse, endVerse, id, reference };
}

// Canonical display name for a USFM code (first full-name key that maps to it).
const CODE_TO_NAME = (() => {
  const out = {};
  const proper = {
    GEN: "Genesis", EXO: "Exodus", LEV: "Leviticus", NUM: "Numbers", DEU: "Deuteronomy",
    JOS: "Joshua", JDG: "Judges", RUT: "Ruth", "1SA": "1 Samuel", "2SA": "2 Samuel",
    "1KI": "1 Kings", "2KI": "2 Kings", "1CH": "1 Chronicles", "2CH": "2 Chronicles",
    EZR: "Ezra", NEH: "Nehemiah", EST: "Esther", JOB: "Job", PSA: "Psalm",
    PRO: "Proverbs", ECC: "Ecclesiastes", SNG: "Song of Solomon", ISA: "Isaiah",
    JER: "Jeremiah", LAM: "Lamentations", EZK: "Ezekiel", DAN: "Daniel", HOS: "Hosea",
    JOL: "Joel", AMO: "Amos", OBA: "Obadiah", JON: "Jonah", MIC: "Micah", NAM: "Nahum",
    HAB: "Habakkuk", ZEP: "Zephaniah", HAG: "Haggai", ZEC: "Zechariah", MAL: "Malachi",
    MAT: "Matthew", MRK: "Mark", LUK: "Luke", JHN: "John", ACT: "Acts", ROM: "Romans",
    "1CO": "1 Corinthians", "2CO": "2 Corinthians", GAL: "Galatians", EPH: "Ephesians",
    PHP: "Philippians", COL: "Colossians", "1TH": "1 Thessalonians", "2TH": "2 Thessalonians",
    "1TI": "1 Timothy", "2TI": "2 Timothy", TIT: "Titus", PHM: "Philemon", HEB: "Hebrews",
    JAS: "James", "1PE": "1 Peter", "2PE": "2 Peter", "1JN": "1 John", "2JN": "2 John",
    "3JN": "3 John", JUD: "Jude", REV: "Revelation",
  };
  Object.assign(out, proper);
  return out;
})();

function humanBook(code) {
  return CODE_TO_NAME[code] || code;
}

module.exports = { BOOK_CODES, bookToCode, parseReference, humanBook };
