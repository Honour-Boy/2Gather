// MessageBubble action menu: right-click (and the hover ⋯) opens a context menu
// whose options depend on ownership; deleted messages show a tombstone and offer
// no menu; an edited message shows the "edited" marker; Delete calls the service.
import { render, screen, fireEvent } from "@testing-library/react";
import MessageBubble from "@/components/chat/MessageBubble";
import { deleteChatMessage } from "@/services/messages";

// Keep the unit light: stub the services + the recipient picker (which pulls in
// firebase) and toast. useLongPress is pure and needs no mock.
jest.mock("@/services/messages", () => ({
  editChatMessage: jest.fn(),
  deleteChatMessage: jest.fn().mockResolvedValue(),
  forwardChatMessage: jest.fn().mockResolvedValue(1),
}));
jest.mock("@/components/chat/RecipientPicker", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/lib/toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const baseMsg = {
  id: "m1",
  text: "Peace be with you",
  senderId: "me",
  createdAt: { toDate: () => new Date() },
};

const renderBubble = (props = {}) =>
  render(
    <MessageBubble
      message={baseMsg}
      isMine
      chatId="chat1"
      currentUser={{ id: "me" }}
      {...props}
    />
  );

afterEach(() => jest.clearAllMocks());

test("right-click on my message opens copy/forward/edit/delete", () => {
  renderBubble();
  fireEvent.contextMenu(screen.getByText("Peace be with you"));

  expect(screen.getByText("Copy")).toBeInTheDocument();
  expect(screen.getByText("Forward")).toBeInTheDocument();
  expect(screen.getByText("Edit")).toBeInTheDocument();
  expect(screen.getByText("Delete")).toBeInTheDocument();
});

test("a partner's message offers copy/forward but not edit/delete", () => {
  renderBubble({ isMine: false, message: { ...baseMsg, senderId: "them" } });
  fireEvent.contextMenu(screen.getByText("Peace be with you"));

  expect(screen.getByText("Copy")).toBeInTheDocument();
  expect(screen.getByText("Forward")).toBeInTheDocument();
  expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  expect(screen.queryByText("Delete")).not.toBeInTheDocument();
});

test("a deleted message shows a tombstone and opens no menu", () => {
  renderBubble({ message: { ...baseMsg, deleted: true, text: "" } });

  expect(screen.getByText("This message was deleted")).toBeInTheDocument();
  fireEvent.contextMenu(screen.getByText("This message was deleted"));
  expect(screen.queryByText("Copy")).not.toBeInTheDocument();
});

test("an edited message shows the 'edited' marker", () => {
  renderBubble({ message: { ...baseMsg, editedAt: { toDate: () => new Date() } } });
  expect(screen.getByText("edited")).toBeInTheDocument();
});

test("Delete invokes the delete service for this message", () => {
  renderBubble();
  fireEvent.contextMenu(screen.getByText("Peace be with you"));
  fireEvent.click(screen.getByText("Delete"));

  expect(deleteChatMessage).toHaveBeenCalledWith({ chatId: "chat1", messageId: "m1" });
});
