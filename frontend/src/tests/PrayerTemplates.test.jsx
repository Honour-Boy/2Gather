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
jest.mock("@/store/userStore", () => ({ __esModule: true, default: jest.fn() }));

beforeEach(() => {
  useUserStore.mockReturnValue({
    currentUser: { id: "me", aiPrayerTemplates: false },
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

test("no AI generate option when the toggle is off", async () => {
  fetchPrayerTemplates.mockResolvedValue([]);
  render(<PrayerTemplates onPick={() => {}} />);

  fireEvent.click(screen.getByLabelText(/prayer templates/i));
  await waitFor(() => expect(fetchPrayerTemplates).toHaveBeenCalled());
  expect(screen.queryByText("✨ Generate a prayer")).not.toBeInTheDocument();
});

test("AI enabled: generates a prayer and picks it together with the suggested verse", async () => {
  useUserStore.mockReturnValue({
    currentUser: { id: "me", aiPrayerTemplates: true },
  });
  fetchPrayerTemplates.mockResolvedValue([]);
  generatePrayer.mockResolvedValue({
    prayer: "Lord, steady my heart. Amen.",
    verse: { reference: "Isaiah 41:10", text: "Do not fear", translation: "WEB" },
    source: "llm",
  });
  const onPick = jest.fn();
  render(<PrayerTemplates onPick={onPick} theme="courage" />);

  fireEvent.click(screen.getByLabelText(/prayer templates/i));
  fireEvent.click(await screen.findByText("✨ Generate a prayer"));

  await waitFor(() =>
    expect(screen.getByText("Lord, steady my heart. Amen.")).toBeInTheDocument()
  );
  expect(generatePrayer).toHaveBeenCalledWith({ theme: "courage", hasVerse: false });

  fireEvent.click(screen.getByText("Use with verse"));
  expect(onPick).toHaveBeenCalledWith(
    "Lord, steady my heart. Amen.\n\n“Do not fear” — Isaiah 41:10 (WEB)"
  );
});
