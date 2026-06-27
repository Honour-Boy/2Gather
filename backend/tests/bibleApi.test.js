jest.mock("axios");
const axios = require("axios");
const {
  getPassage,
  searchBible,
  bibleEnabled,
  budgetRemaining,
  noteCall,
  breakerOpen,
  _resetState,
} = require("../bibleApi");

const httpError = (status) =>
  Object.assign(new Error("http " + status), { response: { status } });

const BIBLE_VARS = ["BIBLE_API_KEY", "BIBLE_ID", "BIBLE_API_BASE", "BIBLE_DAILY_LIMIT"];

beforeEach(() => {
  _resetState();
  axios.get.mockReset();
});
afterEach(() => {
  for (const v of BIBLE_VARS) delete process.env[v];
});

describe("getPassage", () => {
  test("resolves a reference to verbatim text and caches it", async () => {
    process.env.BIBLE_API_KEY = "k";
    axios.get.mockResolvedValue({
      data: { data: { content: "  For God so loved the world.  ", reference: "John 3:16" } },
    });

    const a = await getPassage("John 3:16");
    expect(a).toEqual({ id: "JHN.3.16", reference: "John 3:16", text: "For God so loved the world." });
    expect(axios.get).toHaveBeenCalledTimes(1);

    const b = await getPassage("John 3:16"); // served from cache
    expect(b).toEqual(a);
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  test("returns null for an unparseable reference without calling the API", async () => {
    process.env.BIBLE_API_KEY = "k";
    expect(await getPassage("Hezekiah 3:16")).toBeNull();
    expect(axios.get).not.toHaveBeenCalled();
  });

  test("returns null when disabled (no key) without calling the API", async () => {
    expect(bibleEnabled()).toBe(false);
    expect(await getPassage("John 3:16")).toBeNull();
    expect(axios.get).not.toHaveBeenCalled();
  });

  test("a bad key (401) trips the breaker and returns null", async () => {
    process.env.BIBLE_API_KEY = "bad";
    axios.get.mockRejectedValue(httpError(401));
    expect(await getPassage("John 3:16")).toBeNull();
    expect(breakerOpen()).toBe(true);
    expect(bibleEnabled()).toBe(false); // breaker keeps us from calling again
  });
});

describe("searchBible", () => {
  test("maps API results to { id, reference, text }", async () => {
    process.env.BIBLE_API_KEY = "k";
    axios.get.mockResolvedValue({
      data: { data: { verses: [{ id: "JHN.3.16", reference: "John 3:16", text: " ...loved... " }] } },
    });
    const out = await searchBible("love");
    expect(out).toEqual([{ id: "JHN.3.16", reference: "John 3:16", text: "...loved..." }]);
  });

  test("returns [] when disabled", async () => {
    expect(await searchBible("love")).toEqual([]);
    expect(axios.get).not.toHaveBeenCalled();
  });
});

describe("budget", () => {
  test("disables once the daily budget is spent", () => {
    process.env.BIBLE_API_KEY = "k";
    process.env.BIBLE_DAILY_LIMIT = "2";
    expect(budgetRemaining()).toBe(2);
    noteCall();
    noteCall();
    expect(budgetRemaining()).toBe(0);
    expect(bibleEnabled()).toBe(false);
  });
});
