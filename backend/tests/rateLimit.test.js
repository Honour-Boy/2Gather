// The shared fixed-window rate limiter (extracted from the duplicated copies that
// used to live in verseRecommend.js + prayerGenerate.js).
const { createRateLimiter } = require("../rateLimit");

describe("createRateLimiter", () => {
  test("allows up to `max` per window, then limits", () => {
    const rl = createRateLimiter({ windowMs: 60_000, max: 3 });
    expect(rl.limited("a")).toBe(false); // 1
    expect(rl.limited("a")).toBe(false); // 2
    expect(rl.limited("a")).toBe(false); // 3
    expect(rl.limited("a")).toBe(true); // 4 — over the cap
    expect(rl.limited("a")).toBe(true);
  });

  test("keys are independent — one caller's limit doesn't affect another", () => {
    const rl = createRateLimiter({ windowMs: 60_000, max: 1 });
    expect(rl.limited("a")).toBe(false);
    expect(rl.limited("a")).toBe(true); // a is now limited
    expect(rl.limited("b")).toBe(false); // b is unaffected
  });

  test("the window resets after windowMs elapses", () => {
    let now = 1_000;
    const spy = jest.spyOn(Date, "now").mockImplementation(() => now);
    try {
      const rl = createRateLimiter({ windowMs: 1_000, max: 1 });
      expect(rl.limited("a")).toBe(false);
      expect(rl.limited("a")).toBe(true);
      now += 1_001; // move past the window
      expect(rl.limited("a")).toBe(false); // fresh window
    } finally {
      spy.mockRestore();
    }
  });

  test("_reset clears all counters", () => {
    const rl = createRateLimiter({ windowMs: 60_000, max: 1 });
    expect(rl.limited("a")).toBe(false);
    expect(rl.limited("a")).toBe(true);
    rl._reset();
    expect(rl.limited("a")).toBe(false);
  });
});
