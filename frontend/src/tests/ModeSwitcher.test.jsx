import { render, screen, fireEvent } from "@testing-library/react";
import ModeSwitcher from "@/components/modes/ModeSwitcher";
import useModeStore from "@/store/modeStore";

beforeEach(() => {
  useModeStore.getState().clearMode();
});

test("defaults to General, and selecting a mode updates the store + pressed state", () => {
  render(<ModeSwitcher />);

  expect(screen.getByRole("button", { name: "General" })).toHaveAttribute("aria-pressed", "true");

  fireEvent.click(screen.getByRole("button", { name: "Travel" }));

  expect(useModeStore.getState().activeMode).toBe("travel");
  expect(screen.getByRole("button", { name: "Travel" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "General" })).toHaveAttribute("aria-pressed", "false");
});

test("General clears the active mode", () => {
  useModeStore.getState().setMode("downtime");
  render(<ModeSwitcher />);

  fireEvent.click(screen.getByRole("button", { name: "General" }));

  expect(useModeStore.getState().activeMode).toBeNull();
});
