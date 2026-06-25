// Tests for the persist-first send flow (ROADMAP P0 #3): the original message
// must be written to Firestore BEFORE translation runs, and a translation
// failure must never drop the message.
import { sendChatMessage } from "@/services/messages";
import axios from "axios";
import { addDoc, updateDoc } from "firebase/firestore";

jest.mock("axios");
jest.mock("@/lib/firebase", () => ({ db: {} }));
// @/lib/env uses Vite's import.meta.env, which Jest can't parse — mock it.
jest.mock("@/lib/env", () => ({ TRANSLATE_URL: "https://translate.test/translate" }));
// The userchats preview is maintained server-side (backend /api/userchats/sync),
// so sendChatMessage only writes the message + patches its translation, then
// fires a best-effort sync (mocked here).
jest.mock("firebase/firestore", () => ({
  addDoc: jest.fn(),
  collection: jest.fn(() => "messagesCol"),
  updateDoc: jest.fn(),
}));
jest.mock("@/services/userchats", () => ({ syncUserchats: jest.fn() }));

const baseArgs = {
  chatId: "chat1",
  currentUser: { id: "me" },
  text: "hello",
  sourceLang: "en",
  targetLang: "fr",
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  addDoc.mockResolvedValue({ id: "msg1" });
  updateDoc.mockResolvedValue();
});

afterEach(() => {
  console.warn.mockRestore();
});

test("persists the original message before attempting translation", async () => {
  axios.post.mockResolvedValue({
    status: 200,
    data: { translatedText: "bonjour" },
  });

  await sendChatMessage(baseArgs);

  expect(addDoc).toHaveBeenCalledTimes(1);
  const persisted = addDoc.mock.calls[0][1];
  expect(persisted).toMatchObject({
    senderId: "me",
    text: "hello",
    translatedText: "hello", // mirrors original until translation patches it
    sourceLang: "en",
    targetLang: "fr",
  });

  // Persist-first: addDoc runs before the translation request.
  expect(addDoc.mock.invocationCallOrder[0]).toBeLessThan(
    axios.post.mock.invocationCallOrder[0]
  );
});

test("patches translatedText onto the message when translation succeeds", async () => {
  axios.post.mockResolvedValue({
    status: 200,
    data: { translatedText: "bonjour" },
  });

  await sendChatMessage(baseArgs);

  expect(updateDoc).toHaveBeenCalledWith(
    { id: "msg1" },
    { translatedText: "bonjour" }
  );
});

test("does not throw and keeps the message when translation fails", async () => {
  axios.post.mockRejectedValue(new Error("translate service down"));

  await expect(sendChatMessage(baseArgs)).resolves.toBeUndefined();

  // The message was still persisted, with the original text as the fallback.
  expect(addDoc).toHaveBeenCalledTimes(1);
  const persisted = addDoc.mock.calls[0][1];
  expect(persisted.text).toBe("hello");
  expect(persisted.translatedText).toBe("hello");
  // No translation patch happened.
  expect(updateDoc).not.toHaveBeenCalledWith(
    { id: "msg1" },
    expect.objectContaining({ translatedText: expect.anything() })
  );
});
