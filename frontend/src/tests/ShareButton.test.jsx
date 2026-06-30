// ShareButton opens the recipient picker and forwards the given text/kind to the
// selected chats. It renders nothing without a signed-in user or without text.
import { render, screen, fireEvent } from "@testing-library/react";
import ShareButton from "@/components/chat/ShareButton";
import { forwardChatMessage } from "@/services/messages";

jest.mock("@/services/messages", () => ({
  forwardChatMessage: jest.fn().mockResolvedValue(2),
}));
jest.mock("@/lib/toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
// Stub the picker (it pulls in firebase): immediately "select + send" two chats.
jest.mock("@/components/chat/RecipientPicker", () => ({
  __esModule: true,
  default: ({ onSend }) => (
    <button onClick={() => onSend(["c1", "c2"])}>mock-send</button>
  ),
}));

afterEach(() => jest.clearAllMocks());

test("renders nothing without a signed-in user", () => {
  const { container } = render(<ShareButton text="hi" currentUser={null} />);
  expect(container).toBeEmptyDOMElement();
});

test("renders nothing without text", () => {
  const { container } = render(
    <ShareButton text="" currentUser={{ id: "me" }} />
  );
  expect(container).toBeEmptyDOMElement();
});

test("opens the picker and forwards the text + kind to the chosen chats", async () => {
  render(
    <ShareButton
      text="“Peace I leave with you.” — John 14:27 (WEB)"
      kind="prayer"
      currentUser={{ id: "me" }}
    />
  );

  fireEvent.click(screen.getByLabelText("Send to a chat"));
  fireEvent.click(await screen.findByText("mock-send"));

  expect(forwardChatMessage).toHaveBeenCalledWith({
    chatIds: ["c1", "c2"],
    currentUser: { id: "me" },
    text: "“Peace I leave with you.” — John 14:27 (WEB)",
    kind: "prayer",
  });
});

test("with a note, no prompt path is unchanged — but the prompt appears", () => {
  render(
    <ShareButton
      text="A short prayer."
      kind="prayer"
      currentUser={{ id: "me" }}
      note="This steadied me before the interview."
    />
  );
  fireEvent.click(screen.getByLabelText("Send to a chat"));
  // The confirm modal intercepts before the picker shows.
  expect(screen.getByText("Include your reflection note?")).toBeInTheDocument();
  expect(screen.queryByText("mock-send")).not.toBeInTheDocument();
});

test("choosing 'Yes' appends the reflection note to the sent text", async () => {
  render(
    <ShareButton
      text="A short prayer."
      kind="prayer"
      currentUser={{ id: "me" }}
      note="This steadied me."
    />
  );
  fireEvent.click(screen.getByLabelText("Send to a chat"));
  fireEvent.click(screen.getByText("Yes, include it"));
  fireEvent.click(await screen.findByText("mock-send"));

  expect(forwardChatMessage).toHaveBeenCalledWith({
    chatIds: ["c1", "c2"],
    currentUser: { id: "me" },
    text: "A short prayer.\n\nMy reflection: This steadied me.",
    kind: "prayer",
  });
});

test("choosing 'No' sends just the entry, stripping the note", async () => {
  render(
    <ShareButton
      text="A short prayer."
      kind="prayer"
      currentUser={{ id: "me" }}
      note="This steadied me."
    />
  );
  fireEvent.click(screen.getByLabelText("Send to a chat"));
  fireEvent.click(screen.getByText("No, just the entry"));
  fireEvent.click(await screen.findByText("mock-send"));

  expect(forwardChatMessage).toHaveBeenCalledWith({
    chatIds: ["c1", "c2"],
    currentUser: { id: "me" },
    text: "A short prayer.",
    kind: "prayer",
  });
});
