import { MODES, getMode, themeForMode } from "@/lib/modes";

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
});
