// Integration test for the prayer/chat flow at the receive seam: render the real
// <Chat />, drive its live Firestore subscription with a controlled snapshot, and
// assert incoming messages map to bubbles (including the prayer styling), then
// exercise the composer to confirm a send reaches the message service.
//
// Everything external is mocked: Firestore (so we control the snapshot), the
// zustand stores, the verse/prayer/emoji pickers, and presence.
import { render, screen, fireEvent, act } from "@testing-library/react";
import Chat from "@/components/chat/Chat";
import { onSnapshot } from "firebase/firestore";
import { sendChatMessage } from "@/services/messages";

jest.mock("@/lib/firebase", () => ({ db: {} }));

// Firestore mock. The messages subscription is registered against a tagged
// "query" ref; the presence subscription is against a "user doc" ref, which we
// resolve immediately as non-existent so the component falls back to the store
// snapshot. The messages callback is left for the test to drive.
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
jest.mock("@/components/chat/PrayerTemplates", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/chat/VersePicker", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/ui/Avatar", () => ({ __esModule: true, default: () => null }));
jest.mock("emoji-picker-react", () => ({ __esModule: true, default: () => null }));

jest.mock("@/store/userStore", () => ({
  __esModule: true,
  default: () => ({ currentUser: { id: "me" } }),
}));
jest.mock("@/store/chatStore", () => ({
  __esModule: true,
  default: () => ({
    chatId: "chat1",
    user: { id: "them", fullName: "Ada Partner" },
    isCurrentUserBlocked: false,
    isReceiverBlocked: false,
    resetChat: jest.fn(),
  }),
}));
jest.mock("@/store/modeStore", () => ({
  __esModule: true,
  default: () => ({ activeMode: null }),
}));

const makeSnap = (docs) => ({
  size: docs.length,
  docs: docs.map((m) => ({ id: m.id, data: () => m })),
});

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

test("renders an incoming live snapshot, tagging the prayer message", () => {
  render(<Chat onHeaderClick={() => {}} detailOpen={false} />);

  const deliver = getMessagesCallback();
  act(() =>
    deliver(
      makeSnap([
        // Newest first (desc query): a prayer I sent...
        {
          id: "m2",
          senderId: "me",
          text: "Lord, guide us on this journey",
          kind: "prayer",
        },
        // ...and an earlier message from the partner.
        { id: "m1", senderId: "them", text: "Peace be with you" },
      ])
    )
  );

  expect(screen.getByText("Peace be with you")).toBeInTheDocument();
  expect(screen.getByText("Lord, guide us on this journey")).toBeInTheDocument();
  // The prayer message renders the kind label.
  expect(screen.getByText("Prayer")).toBeInTheDocument();
});

test("composing and sending wires the text through to the message service", () => {
  render(<Chat onHeaderClick={() => {}} detailOpen={false} />);

  fireEvent.change(screen.getByRole("textbox", { name: "Type your message…" }), {
    target: { value: "Amen" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

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

  fireEvent.change(screen.getByRole("textbox", { name: "Type your message…" }), {
    target: { value: "   " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  expect(sendChatMessage).not.toHaveBeenCalled();
});
