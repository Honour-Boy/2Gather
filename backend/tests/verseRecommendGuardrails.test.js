// Cost guardrails for the AI ranking path. These mock the provider (axios) to
// pin the money-protection behaviour: bounded retries, a circuit breaker on a
// bad key / exhausted quota, and a hard daily call budget.
jest.mock("axios");
const axios = require("axios");
const { VERSES } = require("../verses");
const {
  aiConfig,
  aiAvailable,
  budgetRemaining,
  noteLlmCall,
  breakerOpen,
  defaultLlmRank,
  recommendVerses,
  isQuotaError,
  _resetState,
} = require("../verseRecommend");

const CORPUS_IDS = new Set(VERSES.map((v) => v.id));
const httpError = (status, data) =>
  Object.assign(new Error("http " + status), { response: { status, data } });

const AI_VARS = ["AI_API_KEY", "AI_MODEL", "AI_BASE_URL", "AI_MAX_RETRIES", "AI_TIMEOUT_MS", "AI_DAILY_LIMIT"];

beforeEach(() => {
  _resetState();
  axios.post.mockReset();
});
afterEach(() => {
  for (const v of AI_VARS) delete process.env[v];
});

describe("aiConfig", () => {
  test("cheap, safe defaults", () => {
    const cfg = aiConfig();
    expect(cfg.model).toBe("gpt-4o-mini");
    expect(cfg.maxRetries).toBe(1);
    expect(cfg.timeoutMs).toBe(8000);
    expect(cfg.dailyLimit).toBe(200);
  });

  test("clamps env overrides to sane bounds", () => {
    process.env.AI_MAX_RETRIES = "99";
    expect(aiConfig().maxRetries).toBe(3);
    process.env.AI_MAX_RETRIES = "-5";
    expect(aiConfig().maxRetries).toBe(0);
  });
});

describe("aiAvailable", () => {
  test("false without a key, true with one", () => {
    expect(aiAvailable()).toBe(false);
    process.env.AI_API_KEY = "sk-test";
    expect(aiAvailable()).toBe(true);
  });

  test("false once the daily budget is spent", () => {
    process.env.AI_API_KEY = "sk-test";
    process.env.AI_DAILY_LIMIT = "2";
    expect(budgetRemaining()).toBe(2);
    noteLlmCall();
    noteLlmCall();
    expect(budgetRemaining()).toBe(0);
    expect(aiAvailable()).toBe(false);
  });
});

describe("defaultLlmRank retries + breaker", () => {
  test("retries transient errors up to the cap, then gives up", async () => {
    process.env.AI_API_KEY = "sk-test";
    process.env.AI_MAX_RETRIES = "1"; // → 2 attempts total
    axios.post.mockRejectedValue(httpError(503));

    await expect(defaultLlmRank("anxious")).rejects.toBeTruthy();
    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(breakerOpen()).toBe(false); // transient errors don't trip the breaker
  });

  test("a bad key (401) does not retry and trips the breaker", async () => {
    process.env.AI_API_KEY = "sk-bad";
    process.env.AI_MAX_RETRIES = "2";
    axios.post.mockRejectedValue(httpError(401));

    await expect(defaultLlmRank("anxious")).rejects.toBeTruthy();
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(breakerOpen()).toBe(true);
    expect(aiAvailable()).toBe(false); // breaker keeps us from calling again
  });

  test("an exhausted quota (429 insufficient_quota) trips the breaker without retrying", async () => {
    process.env.AI_API_KEY = "sk-test";
    process.env.AI_MAX_RETRIES = "2";
    axios.post.mockRejectedValue(httpError(429, { error: { code: "insufficient_quota" } }));

    await expect(defaultLlmRank("anxious")).rejects.toBeTruthy();
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(breakerOpen()).toBe(true);
  });

  test("isQuotaError recognises billing/quota errors only", () => {
    expect(isQuotaError(httpError(429, { error: { code: "insufficient_quota" } }))).toBe(true);
    expect(isQuotaError(httpError(429, { error: { code: "rate_limit_exceeded" } }))).toBe(false);
  });
});

describe("recommendVerses honours the guardrails", () => {
  test("uses the LLM when available and spends one budget unit", async () => {
    process.env.AI_API_KEY = "sk-test";
    // OpenAI returns a reference; resolution is injected (no API.Bible call needed).
    axios.post.mockResolvedValue({ data: { choices: [{ message: { content: "Isaiah 41:10" } }] } });
    const resolve = async (ref) => ({ id: "ISA.41.10", reference: ref, text: "Don’t be afraid…" });

    const before = budgetRemaining();
    const { verses, source } = await recommendVerses(
      { request: "I'm anxious about my interview" },
      { resolve }
    );

    expect(source).toBe("llm");
    expect(axios.post).toHaveBeenCalledTimes(1); // real OpenAI call path exercised
    expect(verses[0].reference).toBe("Isaiah 41:10");
    expect(budgetRemaining()).toBe(before - 1);
  });

  test("an identical request reuses cached references — no second AI call, no extra tokens", async () => {
    process.env.AI_API_KEY = "sk-test";
    axios.post.mockResolvedValue({ data: { choices: [{ message: { content: "Isaiah 41:10" } }] } });
    const resolve = async (ref) => ({ id: "ISA.41.10", reference: ref, text: "Don’t be afraid…" });

    const before = budgetRemaining();
    const r1 = await recommendVerses({ request: "I'm anxious about an interview" }, { resolve });
    const r2 = await recommendVerses({ request: "I'm anxious about an interview" }, { resolve });

    expect(r1.source).toBe("llm");
    expect(r2.source).toBe("llm");
    expect(axios.post).toHaveBeenCalledTimes(1); // second request reused the references
    expect(budgetRemaining()).toBe(before - 1); // only one unit spent
  });

  test("skips the LLM entirely once the budget is spent (no spend, pure fallback)", async () => {
    process.env.AI_API_KEY = "sk-test";
    process.env.AI_DAILY_LIMIT = "0";

    const { source } = await recommendVerses({ request: "I'm anxious about my interview" });
    expect(source).toBe("fallback");
    expect(axios.post).not.toHaveBeenCalled();
  });
});
