import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PrayerTemplates from "@/components/chat/PrayerTemplates";
import { fetchPrayerTemplates, generatePrayer } from "@/lib/prayerTemplates";
import useUserStore from "@/store/userStore";

// Factory-mock the clients + store so the real modules (and @/lib/env →
// import.meta, firebase) never load.
jest.mock("@/lib/prayerTemplates", () => ({
  fetchPrayerTemplates: jest.fn(),
  generatePrayer: jest.fn(),
}));
jest.mock("@/services/customTemplates", () => ({
  subscribeCustomTemplates: jest.fn(() => () => {}),
}));
jest.mock("@/services/aiPrefs", () => ({
  enableAiPrayerTemplates: jest.fn().mockResolvedValue(),
}));
jest.mock("@/store/userStore", () => ({ __esModule: true, default: jest.fn() }));

beforeEach(() => {
  useUserStore.mockReturnValue({
    currentUser: { id: "me", aiPrayerTemplates: false },
    fetchUserInfo: jest.fn(),
  });
});
afterEach(() => jest.clearAllMocks());

test("opens, lists templates, and calls onPick with the chosen body", async () => {
  fetchPrayerTemplates.mockResolvedValue([
    { id: "tpl-anxious", theme: "peace", title: "Anxious heart", body: "Father, trade my anxiety for Your peace." },
  ]);
  const onPick = jest.fn();
  render(<PrayerTemplates onPick={onPick} />);

  fireEvent.click(screen.getByLabelText(/prayer templates/i));
  await waitFor(() => expect(screen.getByText("Anxious heart")).toBeInTheDocument());

  fireEvent.click(screen.getByText("Anxious heart"));
  expect(onPick).toHaveBeenCalledWith("Father, trade my anxiety for Your peace.");
});

test("does nothing when disabled", () => {
  const onPick = jest.fn();
  render(<PrayerTemplates onPick={onPick} disabled />);

  fireEvent.click(screen.getByLabelText(/prayer templates/i));
  expect(fetchPrayerTemplates).not.toHaveBeenCalled();
  expect(onPick).not.toHaveBeenCalled();
});

test("the Generate-a-prayer wizard is available even with the AI toggle off", async () => {
  fetchPrayerTemplates.mockResolvedValue([]);
  render(<PrayerTemplates onPick={() => {}} />); // aiPrayerTemplates: false

  fireEvent.click(screen.getByLabelText(/prayer templates/i));
  expect(await screen.findByText("✨ Generate a prayer")).toBeInTheDocument();
});

test("generates a prayer that includes the user's scripture and picks the editable result", async () => {
  fetchPrayerTemplates.mockResolvedValue([]);
  generatePrayer.mockResolvedValue({
    prayer: "Lord, steady my heart. Amen.",
    verse: null,
    source: "llm",
  });
  const onPick = jest.fn();
  render(<PrayerTemplates onPick={onPick} theme="courage" />);

  fireEvent.click(screen.getByLabelText(/prayer templates/i));
  fireEvent.click(await screen.findByText("✨ Generate a prayer"));

  // Required scripture (the prayer is based on it; it must appear in the output).
  fireEvent.change(screen.getByLabelText(/scripture or verse/i), {
    target: { value: "Isaiah 41:10" },
  });
  fireEvent.click(screen.getByText("Generate Prayer"));

  const result = await screen.findByLabelText(/your prayer/i);
  await waitFor(() => expect(result.value).toContain("Lord, steady my heart. Amen."));
  expect(result.value).toContain("“Isaiah 41:10”"); // scripture quoted in the result
  // The model writes prose only; its own verse suggestion is suppressed (hasVerse).
  expect(generatePrayer).toHaveBeenCalledWith(
    expect.objectContaining({ theme: "courage", hasVerse: true })
  );

  fireEvent.click(screen.getByText("Use this prayer"));
  expect(onPick).toHaveBeenCalledWith('Lord, steady my heart. Amen.\n\n“Isaiah 41:10”');
});
