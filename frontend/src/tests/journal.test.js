import {
  addJournalEntry,
  saveVerseToJournal,
  savePrayerToJournal,
} from "@/services/journal";
import { addDoc, collection } from "firebase/firestore";

// @/lib/firebase pulls in import.meta (Vite) — mock it; mock the Firestore SDK.
jest.mock("@/lib/firebase", () => ({ db: {} }));
jest.mock("firebase/firestore", () => ({
  addDoc: jest.fn(),
  collection: jest.fn(() => "journalCol"),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  updateDoc: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  addDoc.mockResolvedValue({ id: "j1" });
});

test("writes a reflection (kind/text/createdAt) under the user's journal", async () => {
  await addJournalEntry("user1", { kind: "reflection", text: "Grateful today." });

  expect(collection).toHaveBeenCalledWith({}, "users", "user1", "journal");
  const payload = addDoc.mock.calls[0][1];
  expect(payload).toMatchObject({
    kind: "reflection",
    text: "Grateful today.",
    mode: null,
  });
  expect(payload.createdAt).toBeInstanceOf(Date);
});

test("defaults kind to reflection and mode to null", async () => {
  await addJournalEntry("user1", { text: "x" });
  const p = addDoc.mock.calls[0][1];
  expect(p.kind).toBe("reflection");
  expect(p.mode).toBeNull();
});

test("saveVerseToJournal stores a verse with its reference + text", async () => {
  await saveVerseToJournal("user1", {
    reference: "John 14:27",
    text: "Peace I leave with you.",
  });
  const p = addDoc.mock.calls[0][1];
  expect(p).toMatchObject({
    kind: "verse",
    reference: "John 14:27",
    text: "Peace I leave with you.",
  });
});

test("savePrayerToJournal stores a prayer", async () => {
  await savePrayerToJournal("user1", "Lord, give them peace.");
  const p = addDoc.mock.calls[0][1];
  expect(p).toMatchObject({ kind: "prayer", text: "Lord, give them peace." });
});
