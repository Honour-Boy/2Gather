// PublicRouter sends an already-authenticated visitor into the app and routes
// them by profile state: complete -> /home, incomplete (e.g. fresh Google
// sign-in) -> /create-profile. Signed-out visitors see the public page; while
// auth/profile is resolving it shows a loader (no public-page flash, no
// premature redirect).
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import PublicRouter from "@/components/routers/PublicRouter";
import { useAuth } from "@/context/AuthContext";
import useUserStore from "@/store/userStore";

jest.mock("@/lib/firebase", () => ({ db: {} }));
jest.mock("@/context/AuthContext", () => ({ useAuth: jest.fn() }));

const setStore = (state) =>
  useUserStore.setState({ isLoading: false, currentUser: null, ...state });

afterEach(() => useUserStore.setState({ isLoading: true, currentUser: null }));

function renderPublic() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRouter>
              <div>PUBLIC</div>
            </PublicRouter>
          }
        />
        <Route path="/home" element={<div>HOME</div>} />
        <Route path="/create-profile" element={<div>ONBOARD</div>} />
      </Routes>
    </MemoryRouter>
  );
}

test("renders the public page for a signed-out visitor", () => {
  useAuth.mockReturnValue({ allowUser: false });
  setStore({});
  renderPublic();
  expect(screen.getByText("PUBLIC")).toBeInTheDocument();
});

test("waits (no public page) while the auth state is unknown", () => {
  useAuth.mockReturnValue({ allowUser: undefined });
  setStore({});
  renderPublic();
  expect(screen.queryByText("PUBLIC")).not.toBeInTheDocument();
  expect(screen.queryByText("HOME")).not.toBeInTheDocument();
});

test("sends a signed-in user with a complete profile to home", () => {
  useAuth.mockReturnValue({ allowUser: true });
  setStore({ currentUser: { id: "u1", username: "@jane" } });
  renderPublic();
  expect(screen.getByText("HOME")).toBeInTheDocument();
});

test("sends a signed-in user with no profile to onboarding", () => {
  useAuth.mockReturnValue({ allowUser: true });
  setStore({ currentUser: { id: "u1" } });
  renderPublic();
  expect(screen.getByText("ONBOARD")).toBeInTheDocument();
});
