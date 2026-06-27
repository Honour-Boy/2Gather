import { render, screen, waitFor } from "@testing-library/react";
import VerseOfTheDay from "@/components/verses/VerseOfTheDay";
import { fetchDailyVerse } from "@/lib/verses";

// Factory-mock the data client so the real module (and its @/lib/env →
// import.meta dependency, which Jest can't parse) is never loaded.
jest.mock("@/lib/verses", () => ({ fetchDailyVerse: jest.fn() }));

afterEach(() => jest.clearAllMocks());

test("renders the verse text and reference once loaded", async () => {
  fetchDailyVerse.mockResolvedValue({
    id: "joh-14-27",
    reference: "John 14:27",
    text: "Peace I leave with you.",
    themes: ["peace"],
  });

  render(<VerseOfTheDay />);

  await waitFor(() =>
    expect(screen.getByText(/Peace I leave with you/)).toBeInTheDocument()
  );
  expect(screen.getByText(/John 14:27/)).toBeInTheDocument();
  expect(screen.getByText(/verse of the day/i)).toBeInTheDocument();
});

test("passes the theme through to the data client", async () => {
  fetchDailyVerse.mockResolvedValue({
    id: "mat-11-28",
    reference: "Matthew 11:28",
    text: "Come to me, all you who labor.",
    themes: ["rest"],
  });

  render(<VerseOfTheDay theme="rest" />);

  await waitFor(() =>
    expect(fetchDailyVerse).toHaveBeenCalledWith({ theme: "rest", translation: "WEB" })
  );
});

test("renders nothing if the request fails (ambient, never blocking)", async () => {
  fetchDailyVerse.mockRejectedValue(new Error("offline"));

  render(<VerseOfTheDay />);

  await waitFor(() =>
    expect(screen.queryByText(/verse of the day/i)).not.toBeInTheDocument()
  );
});
