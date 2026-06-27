// AI-curated themed sets + verse-of-the-day + whole-Bible search. The model only
// names references; text comes from the resolver. Tests inject ask/resolve/search
// so nothing hits the network, and verify the static-seed fallback.
const { getVersesByTheme } = require("../verses");
const cv = require("../curatedVerses");

beforeEach(() => {
  delete process.env.AI_API_KEY;
  delete process.env.BIBLE_API_KEY;
  cv._resetState();
});

describe("getThemeVerses", () => {
  test("curates AI references → real text, drops unresolved, tags theme, caches for the day", async () => {
    let asks = 0;
    const ask = async () => {
      asks++;
      return ["Psalm 34:18", "Bogus 9:9", "Romans 8:28"];
    };
    const resolve = async (ref) =>
      ref === "Bogus 9:9" ? null : { id: ref.replace(/\W/g, ""), reference: ref, text: "text of " + ref };

    const a = await cv.getThemeVerses("rest", { ask, resolve });
    expect(a.map((v) => v.reference)).toEqual(["Psalm 34:18", "Romans 8:28"]); // unresolved dropped
    expect(a.every((v) => v.themes.includes("rest"))).toBe(true);

    const b = await cv.getThemeVerses("rest", { ask, resolve }); // served from cache
    expect(b).toEqual(a);
    expect(asks).toBe(1);
  });

  test("falls back to the static seed when AI/API is unavailable", async () => {
    const verses = await cv.getThemeVerses("courage"); // no deps, no keys
    expect(verses).toEqual(getVersesByTheme("courage"));
  });

  test("re-entering a theme reuses cached refs — one AI call, budget spent once", async () => {
    let asks = 0;
    let spends = 0;
    const ask = async () => {
      asks++;
      return ["John 14:27", "Psalm 4:8"];
    };
    const resolve = async (ref) => ({ id: ref, reference: ref, text: "t " + ref });
    const spend = () => {
      spends++;
    };

    await cv.getThemeVerses("rest", { ask, resolve, spend });
    await cv.getThemeVerses("rest", { ask, resolve, spend }); // e.g. switch away + back

    expect(asks).toBe(1); // AI proposed references only once today
    expect(spends).toBe(1); // and the budget was charged only once (not on the cache hit)
  });
});

describe("getDailyVerse", () => {
  test("AI-picks one verse, resolved + cached", async () => {
    let asks = 0;
    const ask = async () => {
      asks++;
      return ["Lamentations 3:22-23"];
    };
    const resolve = async (ref) => ({ id: "LAM.3.22", reference: ref, text: "His mercies never fail." });

    const v = await cv.getDailyVerse(null, { ask, resolve });
    expect(v.reference).toBe("Lamentations 3:22-23");
    await cv.getDailyVerse(null, { ask, resolve }); // cached
    expect(asks).toBe(1);
  });

  test("falls back to the seed daily verse when unavailable", async () => {
    const v = await cv.getDailyVerse(null);
    expect(v && v.id).toBeTruthy();
    expect(v.text.length).toBeGreaterThan(0);
  });
});

describe("searchVerses", () => {
  test("maps whole-Bible API results to the response shape", async () => {
    const search = async () => [{ id: "JHN.3.16", reference: "John 3:16", text: "loved the world" }];
    const out = await cv.searchVerses("love", { search });
    expect(out).toEqual([{ id: "JHN.3.16", reference: "John 3:16", text: "loved the world", themes: [] }]);
  });

  test("falls back to the static-seed search when the API is disabled", async () => {
    const out = await cv.searchVerses("peace"); // no key → seed search
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((v) => /peace/i.test(v.text) || /peace/i.test(v.reference))).toBe(true);
  });

  test("blank query returns nothing", async () => {
    expect(await cv.searchVerses("   ")).toEqual([]);
  });
});
