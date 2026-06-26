const { shouldNotifyUser, buildMessagePayload } = require("../notifications");

describe("shouldNotifyUser", () => {
  test("defaults to true when there are no prefs", () => {
    expect(shouldNotifyUser({})).toBe(true);
    expect(shouldNotifyUser(undefined)).toBe(true);
  });

  test("respects an explicit opt-out", () => {
    expect(shouldNotifyUser({ notificationPrefs: { newMessages: false } })).toBe(false);
  });

  test("stays true for an explicit opt-in", () => {
    expect(shouldNotifyUser({ notificationPrefs: { newMessages: true } })).toBe(true);
  });
});

describe("buildMessagePayload", () => {
  test("uses the sender name and truncates a long preview", () => {
    const p = buildMessagePayload({ senderName: "Mara", preview: "x".repeat(200) });
    expect(p.notification.title).toMatch(/Mara/);
    expect(p.notification.body.length).toBeLessThanOrEqual(140);
    expect(p.data.type).toBe("new_message");
  });

  test("falls back gracefully with no name/preview", () => {
    const p = buildMessagePayload({});
    expect(p.notification.title).toBeTruthy();
    expect(p.notification.body).toBeTruthy();
  });
});
