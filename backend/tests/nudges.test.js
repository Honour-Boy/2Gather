const { isQuietHours, shouldSendNudge, buildNudgeForUser } = require("../nudges");

describe("isQuietHours", () => {
  test("no window means never quiet", () => {
    expect(isQuietHours(undefined, 3)).toBe(false);
    expect(isQuietHours({ start: 7, end: 7 }, 7)).toBe(false);
  });

  test("overnight window (22→7)", () => {
    const qh = { start: 22, end: 7 };
    expect(isQuietHours(qh, 23)).toBe(true);
    expect(isQuietHours(qh, 3)).toBe(true);
    expect(isQuietHours(qh, 7)).toBe(false);
    expect(isQuietHours(qh, 12)).toBe(false);
  });

  test("daytime window (9→17)", () => {
    const qh = { start: 9, end: 17 };
    expect(isQuietHours(qh, 12)).toBe(true);
    expect(isQuietHours(qh, 8)).toBe(false);
    expect(isQuietHours(qh, 17)).toBe(false);
  });
});

describe("shouldSendNudge", () => {
  const base = {
    notificationPrefs: { nudges: true, quietHours: { start: 22, end: 7 } },
    fcmTokens: ["t1"],
  };
  const noon = new Date("2026-06-25T12:00:00");

  test("sends when opted in, has tokens, awake, and not recently nudged", () => {
    expect(shouldSendNudge(base, noon)).toBe(true);
  });

  test("skips when nudges are off", () => {
    expect(shouldSendNudge({ ...base, notificationPrefs: { nudges: false } }, noon)).toBe(false);
  });

  test("skips with no tokens", () => {
    expect(shouldSendNudge({ ...base, fcmTokens: [] }, noon)).toBe(false);
  });

  test("skips during quiet hours", () => {
    const night = new Date("2026-06-25T23:00:00");
    expect(shouldSendNudge(base, night)).toBe(false);
  });

  test("skips when nudged within the last 20h (frequency cap)", () => {
    const recent = { ...base, lastNudgedAt: new Date("2026-06-25T06:00:00") };
    expect(shouldSendNudge(recent, noon)).toBe(false);
  });
});

describe("buildNudgeForUser", () => {
  test("builds an attributed verse nudge for the user's theme", () => {
    const payload = buildNudgeForUser(
      { notificationPrefs: { nudgeTheme: "rest" } },
      "2026-06-25"
    );
    expect(payload.data.type).toBe("nudge");
    expect(payload.notification.title).toBeTruthy();
    expect(payload.notification.body).toMatch(/—/); // "…text…" — Reference
  });
});
