import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VerseFinder from "@/components/verses/VerseFinder";
import { recommendVerses } from "@/lib/verseRecommend";

// Stub firebase (userStore imports it; its @/lib/env/import.meta can't be parsed
// by Jest), then factory-mock the data client + journal service / toast so the
// component renders in isolation.
jest.mock("@/lib/firebase", () => ({ db: {} }));
jest.mock("@/lib/verseRecommend", () => ({ recommendVerses: jest.fn() }));
jest.mock("@/services/journal", () => ({ saveVerseToJournal: jest.fn() }));
jest.mock("@/lib/toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

afterEach(() => jest.clearAllMocks());

test("submitting a request shows the recommended verses", async () => {
  recommendVerses.mockResolvedValue({
    translation: "WEB",
    verses: [
      {
        id: "2ti-1-7",
        reference: "2 Timothy 1:7",
        text: "For God didn’t give us a spirit of fear, but of power, love, and self-control.",
        themes: ["courage"],
      },
    ],
    matchedThemes: ["courage"],
    source: "fallback",
  });

  render(<VerseFinder />);

  fireEvent.change(screen.getByPlaceholderText(/interview tomorrow/i), {
    target: { value: "I'm anxious about my interview" },
  });
  fireEvent.click(screen.getByRole("button", { name: /find verses/i }));

  await waitFor(() =>
    expect(screen.getByText(/spirit of fear/)).toBeInTheDocument()
  );
  expect(screen.getByText(/2 Timothy 1:7/)).toBeInTheDocument();
  expect(recommendVerses).toHaveBeenCalledWith({
    request: "I'm anxious about my interview",
    theme: undefined,
    translation: "WEB",
  });
});

test("shows the support message for a flagged (safety) response", async () => {
  recommendVerses.mockResolvedValue({
    translation: "WEB",
    verses: [
      { id: "psa-46-10", reference: "Psalm 46:10", text: "Be still, and know that I am God.", themes: ["rest"] },
    ],
    matchedThemes: ["peace", "rest"],
    source: "safety",
    support: "If you're thinking about harming yourself, please reach out — call or text 988.",
  });

  render(<VerseFinder />);
  fireEvent.change(screen.getByPlaceholderText(/interview tomorrow/i), {
    target: { value: "i want to give up" },
  });
  fireEvent.click(screen.getByRole("button", { name: /find verses/i }));

  await waitFor(() => expect(screen.getByText(/988/)).toBeInTheDocument());
});

test("surfaces an error if the request fails", async () => {
  recommendVerses.mockRejectedValue(new Error("offline"));

  render(<VerseFinder />);
  fireEvent.change(screen.getByPlaceholderText(/interview tomorrow/i), {
    target: { value: "peace please" },
  });
  fireEvent.click(screen.getByRole("button", { name: /find verses/i }));

  await waitFor(() =>
    expect(screen.getByText(/couldn't find verses/i)).toBeInTheDocument()
  );
});
