// Shared cost-control primitives extracted from verseRecommend.js + bibleApi.js:
// the env parser, the per-UTC-day call budget, and the circuit breaker.
const { intEnv, createDailyBudget, createBreaker } = require("../aiGuards");

describe("intEnv", () => {
  afterEach(() => delete process.env.X_LIMIT);

  test("returns the default when unset or non-numeric", () => {
    expect(intEnv("X_LIMIT", 7, 0, 100)).toBe(7);
    process.env.X_LIMIT = "not-a-number";
    expect(intEnv("X_LIMIT", 7, 0, 100)).toBe(7);
  });

  test("parses and clamps to [min, max]", () => {
    process.env.X_LIMIT = "50";
    expect(intEnv("X_LIMIT", 7, 0, 100)).toBe(50);
    process.env.X_LIMIT = "9999";
    expect(intEnv("X_LIMIT", 7, 0, 100)).toBe(100);
    process.env.X_LIMIT = "-5";
    expect(intEnv("X_LIMIT", 7, 0, 100)).toBe(0);
  });
});

describe("createDailyBudget", () => {
  test("counts down and disables once spent", () => {
    const b = createDailyBudget(() => 2);
    expect(b.remaining()).toBe(2);
    b.note();
    expect(b.remaining()).toBe(1);
    b.note();
    expect(b.remaining()).toBe(0);
  });

  test("reads the limit live (so env overrides apply without restart)", () => {
    let limit = 5;
    const b = createDailyBudget(() => limit);
    expect(b.remaining()).toBe(5);
    limit = 1;
    expect(b.remaining()).toBe(1);
  });

  test("rolls over to a fresh allowance on a new UTC day", () => {
    let day = "2026-06-30T10:00:00.000Z";
    const spy = jest.spyOn(Date.prototype, "toISOString").mockImplementation(() => day);
    try {
      const b = createDailyBudget(() => 3);
      b.note();
      b.note();
      expect(b.remaining()).toBe(1);
      day = "2026-07-01T10:00:00.000Z"; // next day
      expect(b.remaining()).toBe(3); // reset
    } finally {
      spy.mockRestore();
    }
  });

  test("reset clears the count", () => {
    const b = createDailyBudget(() => 2);
    b.note();
    b.note();
    expect(b.remaining()).toBe(0);
    b.reset();
    expect(b.remaining()).toBe(2);
  });
});

describe("createBreaker", () => {
  test("opens on trip and closes on reset", () => {
    const br = createBreaker(30 * 60_000);
    expect(br.open()).toBe(false);
    br.trip();
    expect(br.open()).toBe(true);
    br.reset();
    expect(br.open()).toBe(false);
  });

  test("closes again once the cooldown elapses", () => {
    let now = 1_000;
    const spy = jest.spyOn(Date, "now").mockImplementation(() => now);
    try {
      const br = createBreaker(1_000);
      br.trip();
      expect(br.open()).toBe(true);
      now += 1_001;
      expect(br.open()).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});
