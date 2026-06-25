// Verse engine is pure logic (no Firebase), so it imports and tests directly.
const {
  THEMES,
  VERSES,
  getVersesByTheme,
  getDailyVerse,
  searchVerses,
} = require("../verses");

describe("dataset integrity", () => {
  test("every verse has id, reference, text, and at least one known theme", () => {
    for (const v of VERSES) {
      expect(typeof v.id).toBe("string");
      expect(v.id.length).toBeGreaterThan(0);
      expect(typeof v.reference).toBe("string");
      expect(typeof v.text).toBe("string");
      expect(v.text.length).toBeGreaterThan(0);
      expect(Array.isArray(v.themes)).toBe(true);
      expect(v.themes.length).toBeGreaterThan(0);
      for (const t of v.themes) expect(THEMES).toContain(t);
    }
  });

  test("verse ids are unique", () => {
    const ids = VERSES.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every theme has at least one verse", () => {
    for (const t of THEMES) expect(getVersesByTheme(t).length).toBeGreaterThan(0);
  });
});

describe("getVersesByTheme", () => {
  test("returns only verses tagged with the theme", () => {
    const courage = getVersesByTheme("courage");
    expect(courage.length).toBeGreaterThan(0);
    for (const v of courage) expect(v.themes).toContain("courage");
  });

  test("unknown theme returns an empty list", () => {
    expect(getVersesByTheme("nope")).toEqual([]);
  });
});

describe("getDailyVerse", () => {
  test("is deterministic for a given date", () => {
    const a = getDailyVerse("2026-06-25");
    const b = getDailyVerse("2026-06-25");
    expect(a).toEqual(b);
    expect(a).toBeTruthy();
  });

  test("rotates across days (not always the same verse)", () => {
    const ids = new Set();
    for (let d = 1; d <= 28; d++) {
      const day = String(d).padStart(2, "0");
      ids.add(getDailyVerse(`2026-06-${day}`).id);
    }
    expect(ids.size).toBeGreaterThan(1);
  });

  test("respects a theme filter", () => {
    const v = getDailyVerse("2026-06-25", "rest");
    expect(v.themes).toContain("rest");
  });

  test("falls back to today on an invalid date and still returns a verse", () => {
    expect(getDailyVerse("not-a-date")).toBeTruthy();
  });
});

describe("searchVerses", () => {
  test("matches verse text case-insensitively", () => {
    const results = searchVerses("PEACE");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((v) => /peace/i.test(v.text) || /peace/i.test(v.reference))).toBe(true);
  });

  test("matches by reference", () => {
    const results = searchVerses("John 14");
    expect(results.some((v) => v.reference === "John 14:27")).toBe(true);
  });

  test("blank query returns nothing", () => {
    expect(searchVerses("   ")).toEqual([]);
    expect(searchVerses("")).toEqual([]);
  });
});
