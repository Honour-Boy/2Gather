// The backend is deliberately thin (just a health check + CORS). The one bit of
// real logic is parsing the comma-separated CORS_ORIGIN env var, so that's what
// we test. Importing ../server does NOT start the listener (it's guarded by
// require.main === module).
const { parseAllowedOrigins } = require("../server");

describe("parseAllowedOrigins", () => {
  test("defaults to local Vite when the env var is unset", () => {
    expect(parseAllowedOrigins(undefined)).toEqual(["http://localhost:5173"]);
  });

  test("splits a comma list and trims whitespace", () => {
    expect(
      parseAllowedOrigins("https://unicomm-org.vercel.app, http://localhost:5173")
    ).toEqual(["https://unicomm-org.vercel.app", "http://localhost:5173"]);
  });

  test("drops empty entries from trailing/double commas", () => {
    expect(parseAllowedOrigins("https://a.com,,")).toEqual(["https://a.com"]);
  });
});
