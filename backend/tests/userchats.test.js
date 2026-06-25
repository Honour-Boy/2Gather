// Tests the server-side chat-index logic without real Firebase: ../config/
// firebaseAdmins is mocked so no credentials are needed (CI has none). Focus is
// the security/derivation behaviour — participant enforcement, token handling,
// and that both participants' index entries are written from the latest message.
jest.mock("../config/firebaseAdmins", () => {
  const state = { docData: {}, messages: {}, sets: [] };
  const db = {
    doc: (path) => ({
      get: async () =>
        state.docData[path]
          ? { exists: true, data: () => state.docData[path] }
          : { exists: false },
      set: async (data, opts) => {
        state.sets.push({ path, data, opts });
      },
    }),
    collection: (path) => ({
      orderBy: () => ({
        limit: () => ({
          get: async () => ({ docs: state.messages[path] || [] }),
        }),
      }),
    }),
  };
  const firestore = () => db;
  firestore.FieldValue = { serverTimestamp: () => "SERVER_TS" };
  return {
    __state: state,
    firestore,
    auth: () => ({
      verifyIdToken: async (token) => {
        if (token === "valid") return { uid: "userA" };
        const e = new Error("bad token");
        e.code = "auth/argument-error";
        throw e;
      },
    }),
  };
});

const admin = require("../config/firebaseAdmins");
const { syncChatIndex, userchatsSyncHandler } = require("../userchats");

const resMock = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

beforeEach(() => {
  admin.__state.docData = {};
  admin.__state.messages = {};
  admin.__state.sets = [];
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => console.error.mockRestore());

describe("syncChatIndex", () => {
  test("writes both participants' entries from the latest message", async () => {
    admin.__state.docData["chats/chat1"] = { participantIds: ["userA", "userB"] };
    admin.__state.messages["chats/chat1/messages"] = [
      { data: () => ({ text: "hi", translatedText: "salut", senderId: "userA", createdAt: "T" }) },
    ];

    await syncChatIndex("chat1", "userA");

    const { sets } = admin.__state;
    expect(sets).toHaveLength(2);
    const a = sets.find((s) => s.path === "userchats/userA/items/chat1");
    const b = sets.find((s) => s.path === "userchats/userB/items/chat1");
    expect(a.data).toMatchObject({ chatId: "chat1", receiverId: "userB", lastMessage: "hi", lastTranslatedMessage: "salut", lastSenderId: "userA" });
    expect(b.data).toMatchObject({ chatId: "chat1", receiverId: "userA" });
    expect(a.opts).toEqual({ merge: true });
  });

  test("seeds empty previews when the chat has no messages yet", async () => {
    admin.__state.docData["chats/chat2"] = { participantIds: ["userA", "userB"] };
    await syncChatIndex("chat2", "userB");
    expect(admin.__state.sets).toHaveLength(2);
    expect(admin.__state.sets[0].data).toMatchObject({ lastMessage: "", lastSenderId: null });
  });

  test("rejects a caller who is not a participant (403)", async () => {
    admin.__state.docData["chats/chat1"] = { participantIds: ["userA", "userB"] };
    await expect(syncChatIndex("chat1", "stranger")).rejects.toMatchObject({ status: 403 });
    expect(admin.__state.sets).toHaveLength(0);
  });

  test("404s when the chat doesn't exist", async () => {
    await expect(syncChatIndex("missing", "userA")).rejects.toMatchObject({ status: 404 });
  });
});

describe("userchatsSyncHandler", () => {
  test("401 without a bearer token", async () => {
    const res = resMock();
    await userchatsSyncHandler({ headers: {}, body: { chatId: "chat1" } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("401 on an invalid token", async () => {
    const res = resMock();
    await userchatsSyncHandler({ headers: { authorization: "Bearer nope" }, body: { chatId: "chat1" } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("400 when chatId is missing", async () => {
    const res = resMock();
    await userchatsSyncHandler({ headers: { authorization: "Bearer valid" }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("syncs and returns ok for a valid participant request", async () => {
    admin.__state.docData["chats/chat1"] = { participantIds: ["userA", "userB"] };
    admin.__state.messages["chats/chat1/messages"] = [
      { data: () => ({ text: "hi", translatedText: "hi", senderId: "userA", createdAt: "T" }) },
    ];
    const res = resMock();
    await userchatsSyncHandler({ headers: { authorization: "Bearer valid" }, body: { chatId: "chat1" } }, res);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(admin.__state.sets).toHaveLength(2);
  });
});
