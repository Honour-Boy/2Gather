const { THEMES } = require("../verses");
const { PRAYER_TEMPLATES, getTemplatesByTheme } = require("../prayerTemplates");

describe("prayer template dataset", () => {
  test("every template has id, a known theme, title, and body", () => {
    for (const tpl of PRAYER_TEMPLATES) {
      expect(typeof tpl.id).toBe("string");
      expect(tpl.id.length).toBeGreaterThan(0);
      expect(THEMES).toContain(tpl.theme);
      expect(typeof tpl.title).toBe("string");
      expect(tpl.title.length).toBeGreaterThan(0);
      expect(typeof tpl.body).toBe("string");
      expect(tpl.body.length).toBeGreaterThan(0);
    }
  });

  test("template ids are unique", () => {
    const ids = PRAYER_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every theme has at least one template", () => {
    for (const theme of THEMES) {
      expect(getTemplatesByTheme(theme).length).toBeGreaterThan(0);
    }
  });
});

describe("getTemplatesByTheme", () => {
  test("returns only templates for the given theme", () => {
    const rest = getTemplatesByTheme("rest");
    expect(rest.length).toBeGreaterThan(0);
    for (const tpl of rest) expect(tpl.theme).toBe("rest");
  });

  test("unknown theme returns an empty list", () => {
    expect(getTemplatesByTheme("nope")).toEqual([]);
  });
});
