// Tests for the (translation-free) send flow: the message is persisted to the
// chat's `messages` subcollection, then a best-effort backend sync refreshes the
// sidebar previews. An optional `kind` (e.g. "prayer") is stored only when set.
import { sendChatMessage } from "@/services/messages";
import { addDoc } from "firebase/firestore";
import { syncUserchats } from "@/services/userchats";

jest.mock("@/lib/firebase", () => ({ db: {} }));
jest.mock("firebase/firestore", () => ({
  addDoc: jest.fn(),
  collection: jest.fn(() => "messagesCol"),
}));
jest.mock("@/services/userchats", () => ({ syncUserchats: jest.fn() }));

const baseArgs = { chatId: "chat1", currentUser: { id: "me" }, text: "hello" };

beforeEach(() => {
  jest.clearAllMocks();
  addDoc.mockResolvedValue({ id: "msg1" });
});

test("persists the message with sender id and text", async () => {
  await sendChatMessage(baseArgs);

  expect(addDoc).toHaveBeenCalledTimes(1);
  const persisted = addDoc.mock.calls[0][1];
  expect(persisted).toMatchObject({ senderId: "me", text: "hello" });
  expect(persisted.createdAt).toBeInstanceOf(Date);
});

test("refreshes the sidebar previews via the backend sync", async () => {
  await sendChatMessage(baseArgs);
  expect(syncUserchats).toHaveBeenCalledWith("chat1");
});

test("stores a `kind` field when provided (e.g. prayer)", async () => {
  await sendChatMessage({ ...baseArgs, kind: "prayer" });
  expect(addDoc.mock.calls[0][1].kind).toBe("prayer");
});

test("omits `kind` for ordinary messages", async () => {
  await sendChatMessage(baseArgs);
  expect(addDoc.mock.calls[0][1]).not.toHaveProperty("kind");
});
