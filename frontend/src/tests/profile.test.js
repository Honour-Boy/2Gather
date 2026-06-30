// Public/private profile split: PII (dob/gender) lives in an owner-only subdoc,
// not on the world-readable users/{uid} doc. These tests pin the partition, the
// merge-on-read, the no-op-on-empty write, and the legacy-strip patch.
import {
  PRIVATE_PROFILE_FIELDS,
  splitProfile,
  fetchFullProfile,
  savePrivateProfile,
  stripPrivateFromPublic,
} from "@/services/profile";
import { getDoc, setDoc } from "firebase/firestore";

jest.mock("@/lib/firebase", () => ({ db: {} }));
jest.mock("firebase/firestore", () => ({
  doc: jest.fn((_db, ...path) => ({ path: path.join("/") })),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  deleteField: jest.fn(() => "__DELETE__"),
}));

const snap = (data) => ({ exists: () => data != null, data: () => data });

beforeEach(() => jest.clearAllMocks());

describe("splitProfile", () => {
  test("partitions private fields out of the public set", () => {
    const { pub, priv } = splitProfile({
      username: "@a",
      bio: "hi",
      dob: "2000-01-01",
      gender: "female",
    });
    expect(pub).toEqual({ username: "@a", bio: "hi" });
    expect(priv).toEqual({ dob: "2000-01-01", gender: "female" });
  });

  test("dob and gender are the private fields", () => {
    expect(PRIVATE_PROFILE_FIELDS).toEqual(expect.arrayContaining(["dob", "gender"]));
  });
});

describe("fetchFullProfile", () => {
  test("merges the public doc with the owner-only private subdoc", async () => {
    getDoc.mockImplementation((ref) =>
      Promise.resolve(
        ref.path === "users/u1"
          ? snap({ id: "u1", username: "@a" })
          : snap({ dob: "2000-01-01", gender: "female" })
      )
    );
    const profile = await fetchFullProfile("u1");
    expect(profile).toEqual({ id: "u1", username: "@a", dob: "2000-01-01", gender: "female" });
  });

  test("returns null when there is no public doc yet", async () => {
    getDoc.mockResolvedValue(snap(null));
    expect(await fetchFullProfile("u1")).toBeNull();
  });

  test("falls back to public fields when the private read is denied", async () => {
    getDoc.mockImplementation((ref) =>
      ref.path === "users/u1"
        ? Promise.resolve(snap({ id: "u1", username: "@a" }))
        : Promise.reject(new Error("permission-denied"))
    );
    const profile = await fetchFullProfile("u1");
    expect(profile).toEqual({ id: "u1", username: "@a" });
  });
});

describe("savePrivateProfile", () => {
  test("writes the private fields with merge", async () => {
    await savePrivateProfile("u1", { dob: "2000-01-01" });
    expect(setDoc).toHaveBeenCalledTimes(1);
    expect(setDoc.mock.calls[0][1]).toEqual({ dob: "2000-01-01" });
    expect(setDoc.mock.calls[0][2]).toEqual({ merge: true });
  });

  test("is a no-op for an empty object", async () => {
    await savePrivateProfile("u1", {});
    expect(setDoc).not.toHaveBeenCalled();
  });
});

describe("stripPrivateFromPublic", () => {
  test("returns a deleteField patch for every private field", () => {
    expect(stripPrivateFromPublic()).toEqual({ dob: "__DELETE__", gender: "__DELETE__" });
  });
});
