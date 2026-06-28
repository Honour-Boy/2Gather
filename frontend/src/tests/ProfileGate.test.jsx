// Profile-completeness gating. RequireProfile must never let a profile-less or
// still-loading account reach an app screen (the bug where a fresh Google
// sign-in landed on a broken, data-less Home), and RequireOnboarding must keep
// a completed profile out of the setup screen.
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import {
  RequireProfile,
  RequireOnboarding,
} from "@/components/routers/ProfileGate";
import useUserStore from "@/store/userStore";

// userStore imports the firebase client; stub it (the gate only reads store
// state via setState below, it never calls fetchUserInfo here).
jest.mock("@/lib/firebase", () => ({ db: {} }));

const setStore = (state) =>
  useUserStore.setState({ isLoading: false, currentUser: null, ...state });

afterEach(() => useUserStore.setState({ isLoading: true, currentUser: null }));

function renderGate(ui) {
  return render(
    <MemoryRouter initialEntries={["/x"]}>
      <Routes>
        <Route path="/x" element={ui} />
        <Route path="/home" element={<div>HOME</div>} />
        <Route path="/create-profile" element={<div>ONBOARD</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RequireProfile", () => {
  test("does not render the app while the profile is still loading", () => {
    setStore({ isLoading: true });
    renderGate(
      <RequireProfile>
        <div>APP</div>
      </RequireProfile>
    );
    expect(screen.queryByText("APP")).not.toBeInTheDocument();
    expect(screen.queryByText("ONBOARD")).not.toBeInTheDocument();
  });

  test("redirects to onboarding when the profile has no username", () => {
    setStore({ currentUser: { id: "u1", fullName: "Jane" } });
    renderGate(
      <RequireProfile>
        <div>APP</div>
      </RequireProfile>
    );
    expect(screen.getByText("ONBOARD")).toBeInTheDocument();
    expect(screen.queryByText("APP")).not.toBeInTheDocument();
  });

  test("redirects to onboarding when there is no profile doc at all", () => {
    setStore({ currentUser: null });
    renderGate(
      <RequireProfile>
        <div>APP</div>
      </RequireProfile>
    );
    expect(screen.getByText("ONBOARD")).toBeInTheDocument();
  });

  test("renders the app once the profile is complete", () => {
    setStore({ currentUser: { id: "u1", username: "@jane" } });
    renderGate(
      <RequireProfile>
        <div>APP</div>
      </RequireProfile>
    );
    expect(screen.getByText("APP")).toBeInTheDocument();
  });
});

describe("RequireOnboarding", () => {
  test("renders the setup screen for an incomplete profile", () => {
    setStore({ currentUser: { id: "u1" } });
    renderGate(
      <RequireOnboarding>
        <div>SETUP</div>
      </RequireOnboarding>
    );
    expect(screen.getByText("SETUP")).toBeInTheDocument();
  });

  test("redirects a complete profile away from setup to home", () => {
    setStore({ currentUser: { id: "u1", username: "@jane" } });
    renderGate(
      <RequireOnboarding>
        <div>SETUP</div>
      </RequireOnboarding>
    );
    expect(screen.getByText("HOME")).toBeInTheDocument();
    expect(screen.queryByText("SETUP")).not.toBeInTheDocument();
  });
});
