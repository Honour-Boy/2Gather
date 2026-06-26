import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PrayerTemplates from "@/components/chat/PrayerTemplates";
import { fetchPrayerTemplates } from "@/lib/prayerTemplates";

// Factory-mock the client so the real module (and @/lib/env → import.meta,
// which Jest can't parse) is never loaded.
jest.mock("@/lib/prayerTemplates", () => ({ fetchPrayerTemplates: jest.fn() }));

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
