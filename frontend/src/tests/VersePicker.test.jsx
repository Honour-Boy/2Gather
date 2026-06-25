import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VersePicker from "@/components/chat/VersePicker";
import { fetchVerses } from "@/lib/verses";

// Factory-mock the client so the real module (and @/lib/env → import.meta) never loads.
jest.mock("@/lib/verses", () => ({ fetchVerses: jest.fn() }));

afterEach(() => jest.clearAllMocks());

test("opens, lists verses, and calls onPick with a formatted, attributed snippet", async () => {
  fetchVerses.mockResolvedValue([
    { id: "joh-14-27", reference: "John 14:27", text: "Peace I leave with you.", themes: ["peace"] },
  ]);
  const onPick = jest.fn();
  render(<VersePicker onPick={onPick} />);

  fireEvent.click(screen.getByLabelText(/share a verse/i));
  await waitFor(() => expect(screen.getByText("John 14:27")).toBeInTheDocument());

  fireEvent.click(screen.getByText("John 14:27"));
  expect(onPick).toHaveBeenCalledWith("“Peace I leave with you.” — John 14:27 (WEB)");
});

test("does not open or fetch when disabled", () => {
  const onPick = jest.fn();
  render(<VersePicker onPick={onPick} disabled />);

  fireEvent.click(screen.getByLabelText(/share a verse/i));
  expect(fetchVerses).not.toHaveBeenCalled();
});
