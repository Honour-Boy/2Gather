// authedPost attaches the caller's Firebase ID token and, if the backend rejects
// it (401/403), force-refreshes the token once and retries — so a momentarily
// stale token doesn't fail an otherwise-valid request. No signed-in user => it
// throws before making any request.
import axios from "axios";
import { authedPost } from "@/lib/api";
import { auth } from "@/lib/firebase";

jest.mock("axios", () => ({ post: jest.fn() }));
jest.mock("@/lib/env", () => ({ API_URL: "http://api.test" }));

// Controllable Firebase auth mock: getIdToken returns "fresh" normally and
// "forced" when called with true (force refresh).
const getIdToken = jest.fn((force) => Promise.resolve(force ? "forced" : "fresh"));
jest.mock("@/lib/firebase", () => ({ auth: { currentUser: null } }));

beforeEach(() => {
  jest.clearAllMocks();
  auth.currentUser = { getIdToken };
});

test("throws when there is no signed-in user (no request made)", async () => {
  auth.currentUser = null;
  await expect(authedPost("/api/x", { a: 1 })).rejects.toThrow("Not authenticated");
  expect(axios.post).not.toHaveBeenCalled();
});

test("posts to API_URL + path with a Bearer token and the body", async () => {
  axios.post.mockResolvedValueOnce({ data: "ok" });

  const res = await authedPost("/api/userchats/sync", { chatId: "c1" });

  expect(res).toEqual({ data: "ok" });
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(axios.post).toHaveBeenCalledWith(
    "http://api.test/api/userchats/sync",
    { chatId: "c1" },
    { headers: { Authorization: "Bearer fresh" } }
  );
});

test("on 401, force-refreshes the token and retries once", async () => {
  axios.post
    .mockRejectedValueOnce({ response: { status: 401 } })
    .mockResolvedValueOnce({ data: "ok" });

  const res = await authedPost("/api/x", { a: 1 });

  expect(res).toEqual({ data: "ok" });
  expect(getIdToken).toHaveBeenLastCalledWith(true); // forced refresh
  expect(axios.post).toHaveBeenCalledTimes(2);
  expect(axios.post.mock.calls[1][2]).toEqual({
    headers: { Authorization: "Bearer forced" },
  });
});

test("does not retry on non-auth errors (e.g. 500)", async () => {
  axios.post.mockRejectedValueOnce({ response: { status: 500 } });

  await expect(authedPost("/api/x", {})).rejects.toMatchObject({
    response: { status: 500 },
  });
  expect(axios.post).toHaveBeenCalledTimes(1);
});
