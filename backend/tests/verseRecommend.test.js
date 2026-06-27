// Phase 8 — AI verse recommendations. The model is never trusted for scripture;
// these tests pin the guardrails: results come only from our corpus, the feature
// works with the LLM disabled or failing, no prose is ever returned, and input is
// validated + rate-limited.
const { VERSES } = require("../verses");
const {
  detectThemes,
  recommendVerses,
  recommendHandler,
  _resetState,
  CRISIS_PATTERN,
  MAX_REQUEST_LEN,
} = require("../verseRecommend");

const CORPUS_IDS = new Set(VERSES.map((v) => v.id));

// Minimal Express req/res doubles for handler tests.
const makeRes = () => {
  const res = { statusCode: 200, body: undefined };
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (b) => ((res.body = b), res);
  res.set = () => res;
  return res;
};
const makeReq = (body, ip = "1.1.1.1") => ({ body, ip, headers: {} });

beforeEach(() => {
  delete process.env.AI_API_KEY; // guarantee the offline/fallback path
  delete process.env.BIBLE_API_KEY; // API.Bible disabled → seed-resolution path
  _resetState();
});

describe("detectThemes", () => {
  test("maps a request to the relevant theme(s) by keyword", () => {
    expect(detectThemes("I have a job interview tomorrow and I'm anxious")).toContain("courage");
    expect(detectThemes("about to travel, trusting God with the road")).toContain("journey-and-trust");
    expect(detectThemes("so tired and burned out, need rest")).toContain("rest");
    expect(detectThemes("xyzzy nothing here")).toEqual([]);
  });
});

describe("recommendVerses — grounding", () => {
  test("returns only verses whose text resolves through the Bible source (invented refs dropped)", async () => {
    const llmRank = async () => ["Fakebook 9:9", "Isaiah 41:10", "Madeup 1:1"];
    const resolve = async (ref) =>
      ref === "Isaiah 41:10"
        ? { id: "ISA.41.10", reference: ref, text: "Don’t you be afraid, for I am with you." }
        : null; // an invented reference resolves to nothing → dropped
    const { verses, source } = await recommendVerses(
      { request: "I'm scared about my interview" },
      { llmRank, resolve }
    );
    expect(source).toBe("llm");
    expect(verses).toHaveLength(1);
    expect(verses[0]).toMatchObject({ id: "ISA.41.10", reference: "Isaiah 41:10" });
    expect(verses[0].text).toMatch(/afraid/); // text came from the resolver, not the model
  });

  test("returns a larger set (up to 9) for the client to page through", async () => {
    const llmRank = async () =>
      Array.from({ length: 12 }, (_, i) => `Psalm ${i + 1}:1`); // model offers many
    const resolve = async (ref) => ({ id: ref.replace(/\W/g, ""), reference: ref, text: "text " + ref });
    const { verses } = await recommendVerses({ request: "anxious and afraid" }, { llmRank, resolve });
    expect(verses.length).toBe(9); // capped at RECOMMEND_MAX
  });

  test("recommends real verses from outside the static seed (whole Bible)", async () => {
    // Jeremiah 29:11 isn't in the 25-verse seed; with the whole Bible it can surface.
    const llmRank = async () => ["Jeremiah 29:11"];
    const resolve = async (ref) => ({
      id: "JER.29.11",
      reference: ref,
      text: "For I know the plans I have for you, says Yahweh…",
    });
    const { verses, source } = await recommendVerses(
      { request: "I feel hopeless about my future" },
      { llmRank, resolve }
    );
    expect(source).toBe("llm");
    expect(verses[0].reference).toBe("Jeremiah 29:11");
    expect(CORPUS_IDS.has("JER.29.11")).toBe(false); // genuinely beyond the seed
  });

  test("resolveReference falls back to the static seed when API.Bible is unavailable", async () => {
    // No BIBLE_API_KEY → API.Bible disabled; a seed reference the model names still
    // resolves from our bundled text (uses the real tiered resolver, no inject).
    const llmRank = async () => ["2 Timothy 1:7"];
    const { verses, source } = await recommendVerses({ request: "I need courage" }, { llmRank });
    expect(source).toBe("llm");
    expect(verses[0].id).toBe("2ti-1-7");
    expect(CORPUS_IDS.has("2ti-1-7")).toBe(true);
  });

  test("never returns generated prose — only {id, reference, text, themes}", async () => {
    // No key + no injected ranker → the static-seed fallback path.
    const { verses } = await recommendVerses({ request: "thankful for a new job" });
    for (const v of verses) {
      expect(Object.keys(v).sort()).toEqual(["id", "reference", "text", "themes"]);
      expect(CORPUS_IDS.has(v.id)).toBe(true);
    }
  });
});

describe("recommendVerses — graceful fallback", () => {
  test("falls back to keyword→theme retrieval when the provider errors", async () => {
    const llmRank = async () => {
      throw new Error("provider 503");
    };
    const { verses, source, matchedThemes } = await recommendVerses(
      { request: "I'm so anxious and worried" },
      { llmRank }
    );
    expect(source).toBe("fallback");
    expect(matchedThemes).toContain("peace");
    expect(verses.length).toBeGreaterThan(0);
    for (const v of verses) expect(CORPUS_IDS.has(v.id)).toBe(true);
  });

  test("works with the LLM disabled (no key, no injected ranker)", async () => {
    const { verses, source } = await recommendVerses({ request: "travelling and nervous" });
    expect(source).toBe("fallback");
    expect(verses.length).toBeGreaterThan(0);
  });

  test("always returns at least one verse, even for an unmatched request", async () => {
    const { verses } = await recommendVerses({ request: "qwerty zxcvb" });
    expect(verses.length).toBeGreaterThan(0);
  });
});

describe("safety", () => {
  test("crisis pattern matches concerning phrasing", () => {
    expect(CRISIS_PATTERN.test("I want to die")).toBe(true);
    expect(CRISIS_PATTERN.test("thinking about my future")).toBe(false);
  });

  test("a crisis request is redirected with support + comfort verses, no LLM", async () => {
    const llmRank = jest.fn();
    const result = await recommendVerses(
      { request: "I want to kill myself" },
      { llmRank }
    );
    expect(result.source).toBe("safety");
    expect(result.support).toMatch(/988/);
    expect(result.verses.length).toBeGreaterThan(0);
    for (const v of result.verses) expect(CORPUS_IDS.has(v.id)).toBe(true);
    expect(llmRank).not.toHaveBeenCalled();
  });
});

describe("recommendHandler — validation, limits, shape", () => {
  test("400 when request is missing or blank", async () => {
    const res = makeRes();
    await recommendHandler(makeReq({}), res);
    expect(res.statusCode).toBe(400);

    const res2 = makeRes();
    await recommendHandler(makeReq({ request: "   " }), res2);
    expect(res2.statusCode).toBe(400);
  });

  test("400 when request is too long", async () => {
    const res = makeRes();
    await recommendHandler(makeReq({ request: "a".repeat(MAX_REQUEST_LEN + 1) }), res);
    expect(res.statusCode).toBe(400);
  });

  test("400 on an unknown theme", async () => {
    const res = makeRes();
    await recommendHandler(makeReq({ request: "peace please", theme: "nope" }), res);
    expect(res.statusCode).toBe(400);
  });

  test("200 happy path returns corpus verses + translation, no prose fields", async () => {
    const res = makeRes();
    await recommendHandler(makeReq({ request: "anxious about an interview" }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.translation).toBe("WEB");
    expect(res.body.verses.length).toBeGreaterThan(0);
    for (const v of res.body.verses) expect(CORPUS_IDS.has(v.id)).toBe(true);
    expect(res.body).not.toHaveProperty("prayer");
  });

  test("rate-limits a noisy caller (429 after the window cap)", async () => {
    let limited = false;
    for (let i = 0; i < 25; i++) {
      const res = makeRes();
      await recommendHandler(makeReq({ request: "peace" }, "9.9.9.9"), res);
      if (res.statusCode === 429) {
        limited = true;
        break;
      }
    }
    expect(limited).toBe(true);
  });
});
