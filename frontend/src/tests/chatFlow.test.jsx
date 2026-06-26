// Integration test for the realtime prayer/chat flow at the component seam that
// the unit tests don't cover: the *receive* half. `messages.test.js` already
// covers send→persist→translate→sync (the service). Here we render the real
// <Chat /> and drive its live Firestore subscription to assert that an incoming
// snapshot is mapped to bubbles correctly — partner messages show the recipient's
// translated text, the sender's own messages show the original, and a
// `kind: "prayer"` message renders the prayer styling. We then exercise the
// composer to confirm a send is wired through to the message service.
//
// Everything external to the render-and-send pipeline is mocked: Firestore (so we
// can hand the component a controlled snapshot), the zustand stores, the verse/
// prayer pickers and emoji picker (they pull in import.meta-based env), presence,
// and i18n (so `t` is deterministic).
import { render, screen, fireEvent, act } from "@testing-library/react";
import Chat from "@/components/chat/Chat";
import { onSnapshot } from "firebase/firestore";
import { sendChatMessage } from "@/services/messages";

// Deterministic translations: return the provided default string, else the key.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, def) => (typeof def === "string" ? def : key),
  }),
}));

jest.mock("@/lib/firebase", () => ({ db: {} }));

// Firestore mock. The messages subscription is registered against a tagged
// "query" ref; the two presence subscriptions are against "user doc" refs, which
// we resolve immediately as non-existent so the component falls back to the store
// snapshots. The messages callback is left for the test to drive via
// onSnapshot.mock.calls (simulating a live snapshot arriving).
jest.mock("firebase/firestore", () => {
  const onSnapshot = jest.fn((ref, cb) => {
    if (ref && ref.__userDoc) cb({ exists: () => false });
    return () => {};
  });
  return {
    collection: jest.fn(() => ({ __col: true })),
    doc: jest.fn((_db, _coll, id) => ({ __userDoc: true, id })),
    query: jest.fn(() => ({ __messagesQuery: true })),
    orderBy: jest.fn(() => ({})),
    limit: jest.fn(() => ({})),
    onSnapshot,
  };
});

jest.mock("@/services/messages", () => ({ sendChatMessage: jest.fn() }));
jest.mock("@/hooks/usePresence", () => ({ isUserOnline: () => false }));

// Pickers and emoji picker pull in env (import.meta) / heavy deps — stub them.
jest.mock("@/components/chat/PrayerTemplates", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/chat/VersePicker", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/ui/Avatar", () => ({ __esModule: true, default: () => null }));
jest.mock("emoji-picker-react", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/common/Languages", () => ({
  __esModule: true,
  default: [
    { value: "en", label: "English" },
    { value: "fr", label: "French" },
  ],
}));

// Stores: a signed-in "me" talking to partner "them" (who speaks French).
jest.mock("@/store/userStore", () => ({
  __esModule: true,
  default: () => ({ currentUser: { id: "me", language: "en" } }),
}));
jest.mock("@/store/chatStore", () => ({
  __esModule: true,
  default: () => ({
    chatId: "chat1",
    user: { id: "them", fullName: "Ada Partner", language: "fr" },
    isCurrentUserBlocked: false,
    isReceiverBlocked: false,
    resetChat: jest.fn(),
  }),
}));
jest.mock("@/store/modeStore", () => ({
  __esModule: true,
  default: () => ({ activeMode: null }),
}));

// Build a Firestore-shaped snapshot. Chat reads `snap.size` and maps
// `snap.docs` (newest-first from the desc query) then reverses to ascending.
const makeSnap = (docs) => ({
  size: docs.length,
  docs: docs.map((m) => ({ id: m.id, data: () => m })),
});

// Pull the messages-subscription callback that Chat registered on mount.
const getMessagesCallback = () => {
  const call = onSnapshot.mock.calls.find(([ref]) => ref && ref.__messagesQuery);
  if (!call) throw new Error("messages subscription was never registered");
  return call[1];
};

// jsdom doesn't implement scrollIntoView; Chat calls it on auto-scroll.
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

afterEach(() => jest.clearAllMocks());

test("renders an incoming live snapshot: partner sees translation, prayer is tagged", () => {
  render(<Chat onHeaderClick={() => {}} detailOpen={false} />);

  const deliver = getMessagesCallback();
  act(() =>
    deliver(
      makeSnap([
        // Newest first (desc query). A prayer I sent...
        {
          id: "m2",
          senderId: "me",
          text: "Lord, guide us on this journey",
          translatedText: "Lord, guide us on this journey",
          kind: "prayer",
        },
        // ...and an earlier message from the partner, stored in their language
        // with a translation for me (the recipient view shows the translation).
        {
          id: "m1",
          senderId: "them",
          text: "Que la paix soit avec toi",
          translatedText: "Peace be with you",
        },
      ])
    )
  );

  // Receive half: the partner's message renders as its translation for the viewer.
  expect(screen.getByText("Peace be with you")).toBeInTheDocument();
  // The untranslated original is not shown to the recipient until toggled.
  expect(screen.queryByText("Que la paix soit avec toi")).not.toBeInTheDocument();

  // My own prayer renders its original text with the "Prayer" kind label.
  expect(screen.getByText("Lord, guide us on this journey")).toBeInTheDocument();
  expect(screen.getByText("Prayer")).toBeInTheDocument();
});

test("composing and sending wires the text through to the message service", () => {
  render(<Chat onHeaderClick={() => {}} detailOpen={false} />);

  // The composer input carries an accessible name (aria-label), not just a
  // placeholder — so query it by role+name.
  fireEvent.change(
    screen.getByRole("textbox", { name: "chat.messagePlaceholder" }),
    { target: { value: "Amen" } }
  );
  fireEvent.click(screen.getByRole("button", { name: "chat.send" }));

  expect(sendChatMessage).toHaveBeenCalledTimes(1);
  expect(sendChatMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      chatId: "chat1",
      text: "Amen",
      currentUser: expect.objectContaining({ id: "me" }),
    })
  );
});

test("an empty composer does not send", () => {
  render(<Chat onHeaderClick={() => {}} detailOpen={false} />);

  // Whitespace-only input stays disabled / no-ops.
  fireEvent.change(
    screen.getByRole("textbox", { name: "chat.messagePlaceholder" }),
    { target: { value: "   " } }
  );
  fireEvent.click(screen.getByRole("button", { name: "chat.send" }));

  expect(sendChatMessage).not.toHaveBeenCalled();
});
