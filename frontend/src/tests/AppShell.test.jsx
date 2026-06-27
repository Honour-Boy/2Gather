// AppShell composition + route-aware mobile chrome. The shell hosts every
// signed-in screen, so we verify it renders the children, exposes a reachable
// logout (the desktop rail is hidden on phones), shows all five tabs, and
// suppresses the global mobile top bar on the full-bleed Pray screen.
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";

// LogoutNow pulls in firebase/auth + the zustand stores; stub it to a plain
// button so this test stays focused on AppShell's layout and route logic.
jest.mock("@/components/common/LogoutNow", () => ({
  __esModule: true,
  default: () => <button aria-label="Log out">Log out</button>,
}));
jest.mock("@/components/ui/BrandMark", () => ({
  __esModule: true,
  default: () => <span data-testid="brand-mark" />,
}));

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell>
        <div>Page content</div>
      </AppShell>
    </MemoryRouter>
  );

test("renders children, the mobile top bar, a reachable logout, and all five tabs", () => {
  renderAt("/home");

  expect(screen.getByText("Page content")).toBeInTheDocument();

  // The wordmark text only appears in the mobile top bar (the desktop rail shows
  // the mark without text), so it's a reliable signal the top bar rendered.
  expect(screen.getByText("2Gather")).toBeInTheDocument();

  // Logout is reachable (desktop rail + mobile top bar both render it).
  expect(
    screen.getAllByRole("button", { name: "Log out" }).length
  ).toBeGreaterThan(0);

  // All five destinations are present.
  for (const label of ["Home", "Pray", "Verses", "Journal", "You"]) {
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  }
});

test("hides the global mobile top bar on the full-bleed Pray screen", () => {
  renderAt("/pray");

  // Chat owns its own header on /pray, so the global top bar (and its wordmark)
  // is suppressed to give the conversation all the room.
  expect(screen.queryByText("2Gather")).not.toBeInTheDocument();

  // Navigation is still available via the bottom tab bar / rail.
  expect(screen.getAllByText("Pray").length).toBeGreaterThan(0);
});
