import {
  MODES,
  getMode,
  themeForMode,
  accentForMode,
  headlineForMode,
  BRAND_ACCENT,
} from "@/lib/modes";

// Mirrors the verse/template theme taxonomy (backend/verses.js).
const VALID_THEMES = ["journey-and-trust", "courage", "rest", "gratitude", "peace"];

describe("modes", () => {
  test("each mode has id, label, description, and a valid theme", () => {
    for (const m of MODES) {
      expect(m.id).toBeTruthy();
      expect(typeof m.label).toBe("string");
      expect(m.label).toBeTruthy();
      expect(typeof m.description).toBe("string");
      expect(VALID_THEMES).toContain(m.theme);
    }
  });

  test("mode ids are unique", () => {
    const ids = MODES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("there are five modes covering the planned life situations", () => {
    expect(MODES.map((m) => m.id).sort()).toEqual(
      ["downtime", "interview", "pitch", "promotion", "travel"]
    );
  });

  test("themeForMode resolves a mode's theme; undefined for general/unknown", () => {
    expect(themeForMode("travel")).toBe("journey-and-trust");
    expect(themeForMode("downtime")).toBe("rest");
    expect(themeForMode(null)).toBeUndefined();
    expect(themeForMode("nope")).toBeUndefined();
  });

  test("getMode returns the mode object or null", () => {
    expect(getMode("interview")?.theme).toBe("courage");
    expect(getMode("nope")).toBeNull();
  });

  test("every mode has a distinct, valid hex accent + a headline", () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    const accents = new Set();
    for (const m of MODES) {
      expect(m.accent).toMatch(hex);
      expect(typeof m.headline).toBe("string");
      expect(m.headline.length).toBeGreaterThan(0);
      accents.add(m.accent);
    }
    expect(accents.size).toBe(MODES.length); // each mode visually distinct
  });

  test("accentForMode resolves a hex; falls back to brand gold for general/unknown", () => {
    expect(accentForMode("travel")).toBe("#6E96C4");
    expect(accentForMode(null)).toBe(BRAND_ACCENT);
    expect(accentForMode("nope")).toBe(BRAND_ACCENT);
  });

  test("headlineForMode resolves a mode's headline; empty for general/unknown", () => {
    expect(headlineForMode("downtime")).toMatch(/rest/i);
    expect(headlineForMode(null)).toBe("");
    expect(headlineForMode("nope")).toBe("");
  });
});
