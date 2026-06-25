import { addJournalEntry } from "@/services/journal";
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
}));

beforeEach(() => {
  jest.clearAllMocks();
  addDoc.mockResolvedValue({ id: "j1" });
});

test("writes mode, body, and a createdAt under the user's journal subcollection", async () => {
  await addJournalEntry("user1", { mode: "travel", body: "Safe trip today." });

  expect(collection).toHaveBeenCalledWith({}, "users", "user1", "journal");
  expect(addDoc).toHaveBeenCalledTimes(1);
  const payload = addDoc.mock.calls[0][1];
  expect(payload).toMatchObject({ mode: "travel", body: "Safe trip today." });
  expect(payload.createdAt).toBeInstanceOf(Date);
});

test("defaults mode to null when none is given (general)", async () => {
  await addJournalEntry("user1", { body: "General reflection." });
  expect(addDoc.mock.calls[0][1].mode).toBeNull();
});
