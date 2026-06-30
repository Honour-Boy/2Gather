import { render, screen, fireEvent } from "@testing-library/react";
import GeneratePrayerModal from "@/components/chat/GeneratePrayerModal";
import { generatePrayer } from "@/lib/prayerTemplates";

jest.mock("@/lib/prayerTemplates", () => ({ generatePrayer: jest.fn() }));

afterEach(() => jest.clearAllMocks());

test("the Generate button is disabled until a scripture is entered", () => {
  render(<GeneratePrayerModal onPick={() => {}} onClose={() => {}} />);
  const btn = screen.getByText("Generate Prayer");
  expect(btn).toBeDisabled();

  fireEvent.change(screen.getByLabelText(/scripture or verse/i), {
    target: { value: "John 14:27" },
  });
  expect(btn).toBeEnabled();
  expect(generatePrayer).not.toHaveBeenCalled(); // not until the user clicks
});

test("tapping the backdrop closes the modal", () => {
  const onClose = jest.fn();
  render(<GeneratePrayerModal onPick={() => {}} onClose={onClose} />);
  // The outermost dialog element is the backdrop.
  fireEvent.click(screen.getByRole("dialog"));
  expect(onClose).toHaveBeenCalled();
});

test("fires onConsent on the first generation when AI was not yet enabled", async () => {
  generatePrayer.mockResolvedValue({ prayer: "Father, be near. Amen.", verse: null });
  const onConsent = jest.fn();
  render(
    <GeneratePrayerModal aiEnabled={false} onConsent={onConsent} onPick={() => {}} onClose={() => {}} />
  );
  fireEvent.change(screen.getByLabelText(/scripture or verse/i), {
    target: { value: "Psalm 23:1" },
  });
  fireEvent.click(screen.getByText("Generate Prayer"));
  expect(onConsent).toHaveBeenCalledTimes(1);
  expect(await screen.findByLabelText(/your prayer/i)).toBeInTheDocument();
});
