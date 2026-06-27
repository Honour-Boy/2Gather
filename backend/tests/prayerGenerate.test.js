// AI prayer-template generation. The model (injected in tests) writes the prayer
// prose; scripture stays from our corpus; crisis inputs are redirected; and it
// degrades to a curated template when AI is off or errors.
const { generatePrayer, PRAYER_SYSTEM_PROMPT } = require("../prayerGenerate");

beforeEach(() => {
  // Ensure no ambient key flips the no-deps path into a live call.
  delete process.env.AI_API_KEY;
});

test("fallback (AI off): a curated prayer + a real themed verse, no model call", async () => {
  const r = await generatePrayer({ theme: "peace" });
  expect(r.source).toBe("fallback");
  expect(typeof r.prayer).toBe("string");
  expect(r.prayer.length).toBeGreaterThan(0);
  expect(r.verse).toMatchObject({
    reference: expect.any(String),
    text: expect.any(String),
  });
});

test("AI path (injected): returns the generated prayer + a suggested verse", async () => {
  const generate = jest.fn().mockResolvedValue("Lord, steady my heart. Amen.");
  const r = await generatePrayer(
    { topic: "interview nerves", theme: "courage", hasVerse: false },
    { generate }
  );
  expect(generate).toHaveBeenCalledTimes(1);
  expect(r.source).toBe("llm");
  expect(r.prayer).toBe("Lord, steady my heart. Amen.");
  expect(r.verse).toBeTruthy();
});

test("does not suggest a verse when the user already chose one", async () => {
  const generate = jest.fn().mockResolvedValue("Father, thank You. Amen.");
  const r = await generatePrayer(
    { topic: "thankful", theme: "gratitude", hasVerse: true },
    { generate }
  );
  expect(r.verse).toBeNull();
});

test("a model failure falls back to a curated prayer", async () => {
  const generate = jest.fn().mockRejectedValue(new Error("boom"));
  const r = await generatePrayer({ theme: "rest" }, { generate });
  expect(r.source).toBe("fallback");
  expect(r.prayer.length).toBeGreaterThan(0);
});

test("a crisis topic is redirected with care and never reaches the model", async () => {
  const generate = jest.fn();
  const r = await generatePrayer({ topic: "I want to die" }, { generate });
  expect(generate).not.toHaveBeenCalled();
  expect(r.source).toBe("safety");
  expect(r.support).toMatch(/988/);
  expect(r.verse).toBeTruthy();
});

test("the system prompt forbids the model from quoting scripture", () => {
  expect(PRAYER_SYSTEM_PROMPT).toMatch(/do not quote/i);
});
