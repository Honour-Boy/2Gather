import { displayName } from "@/lib/displayName";

describe("displayName", () => {
  test("prefers the full / display name", () => {
    expect(displayName({ fullName: "John Doe", username: "@johndoe" })).toBe("John Doe");
  });

  test("falls back to the username without the leading @", () => {
    expect(displayName({ username: "@johndoe" })).toBe("johndoe");
    expect(displayName({ fullName: "   ", username: "@jane" })).toBe("jane");
  });

  test("uses the neutral fallback when both are missing", () => {
    expect(displayName({})).toBe("Someone");
    expect(displayName(null)).toBe("Someone");
    expect(displayName({}, "")).toBe("");
  });
});
