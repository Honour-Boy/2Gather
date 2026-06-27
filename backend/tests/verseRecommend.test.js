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
const TEXT_BY_ID = new Map(VERSES.map((v) => [v.id, v.text]));

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
  test("returns only verses from our corpus (LLM can't smuggle in ids)", async () => {
    const llmRank = async () => ["not-a-real-id", "isa-41-10", "also-fake"];
    const { verses, source } = await recommendVerses(
      { request: "I'm scared about my interview" },
      { llmRank }
    );
    expect(source).toBe("llm");
    expect(verses.length).toBeGreaterThan(0);
    for (const v of verses) {
      expect(CORPUS_IDS.has(v.id)).toBe(true);
      expect(v.text).toBe(TEXT_BY_ID.get(v.id)); // verbatim from our data
    }
    expect(verses.some((v) => v.id === "not-a-real-id" || v.id === "also-fake")).toBe(false);
  });

  test("caps results to at most 3", async () => {
    const llmRank = async (_req, candidates) => candidates.map((c) => c.id); // greedily pick all
    const { verses } = await recommendVerses(
      { request: "anxious and afraid" },
      { llmRank }
    );
    expect(verses.length).toBeLessThanOrEqual(3);
  });

  test("never returns generated prose — only {id, reference, text, themes}", async () => {
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
