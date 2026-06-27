// Tests for the (translation-free) send flow: the message is persisted to the
// chat's `messages` subcollection, then a best-effort backend sync refreshes the
// sidebar previews. An optional `kind` (e.g. "prayer") is stored only when set.
import {
  sendChatMessage,
  editChatMessage,
  deleteChatMessage,
  forwardChatMessage,
} from "@/services/messages";
import { addDoc, updateDoc, doc } from "firebase/firestore";
import { syncUserchats } from "@/services/userchats";

jest.mock("@/lib/firebase", () => ({ db: {} }));
jest.mock("firebase/firestore", () => ({
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(() => "messagesCol"),
  doc: jest.fn((_db, ...path) => ({ __doc: path.join("/") })),
  serverTimestamp: jest.fn(() => "ts"),
}));
jest.mock("@/services/userchats", () => ({ syncUserchats: jest.fn() }));

const baseArgs = { chatId: "chat1", currentUser: { id: "me" }, text: "hello" };

beforeEach(() => {
  jest.clearAllMocks();
  addDoc.mockResolvedValue({ id: "msg1" });
  updateDoc.mockResolvedValue();
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

test("editChatMessage updates the text + editedAt and re-syncs", async () => {
  await editChatMessage({ chatId: "chat1", messageId: "m1", text: "fixed" });

  expect(doc).toHaveBeenCalledWith({}, "chats", "chat1", "messages", "m1");
  expect(updateDoc).toHaveBeenCalledTimes(1);
  expect(updateDoc.mock.calls[0][1]).toMatchObject({ text: "fixed", editedAt: "ts" });
  expect(syncUserchats).toHaveBeenCalledWith("chat1");
});

test("deleteChatMessage soft-deletes (tombstone) and re-syncs", async () => {
  await deleteChatMessage({ chatId: "chat1", messageId: "m1" });

  expect(updateDoc).toHaveBeenCalledTimes(1);
  expect(updateDoc.mock.calls[0][1]).toMatchObject({ deleted: true, text: "" });
  expect(syncUserchats).toHaveBeenCalledWith("chat1");
});

test("forwardChatMessage sends to each target and returns the count", async () => {
  const n = await forwardChatMessage({
    chatIds: ["c1", "c2", ""],
    currentUser: { id: "me" },
    text: "share this",
    kind: "prayer",
  });

  // Empty/falsy ids are dropped; one message per real target.
  expect(n).toBe(2);
  expect(addDoc).toHaveBeenCalledTimes(2);
  expect(addDoc.mock.calls[0][1]).toMatchObject({ text: "share this", kind: "prayer", senderId: "me" });
});
