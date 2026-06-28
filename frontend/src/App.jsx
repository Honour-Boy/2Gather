import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Intro from "./pages/Intro";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/CreateProfile";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import Verses from "./pages/Verses";
import ChatRoom from "./pages/ChatRoom";
import Settings from "./pages/Settings";
import Journal from "./pages/Journal";
import NotFound from "./pages/NotFound";
import PrivateRouter from "@/components/routers/PrivateRouter";
import PublicRouter from "@/components/routers/PublicRouter";
import { RequireProfile, RequireOnboarding } from "@/components/routers/ProfileGate";
import AppShell from "@/components/layout/AppShell";
import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import useUserStore from "@/store/userStore";
import usePresence from "@/hooks/usePresence";
import "./styles/App.css";

// Every signed-in screen: PrivateRouter checks the session, RequireProfile waits
// for the profile to load and forces onboarding for half-onboarded accounts
// (no username — e.g. a fresh Google sign-in), then it renders inside the
// persistent AppShell (desktop rail + mobile top/bottom bars).
const authed = (Page) => (
  <PrivateRouter>
    <RequireProfile>
      <AppShell>
        <Page />
      </AppShell>
    </RequireProfile>
  </PrivateRouter>
);

function App() {
  const { fetchUserInfo, clearUserInfo, currentUser } = useUserStore();
  usePresence(currentUser?.id);
  useEffect(() => {
    // Mirror the Firebase session into the profile store: load the profile on
    // sign-in, clear it on sign-out / session expiry (so stale data can't leak
    // into the next session or confuse the route guards).
    const unSub = onAuthStateChanged(auth, (user) => {
      if (user) fetchUserInfo(user.uid);
      else clearUserInfo();
    });
    return () => unSub();
  }, [fetchUserInfo, clearUserInfo]);

  return (
    <Router>
      <div className="h-full w-full overflow-hidden bg-uni-bg font-sans">
        <Routes>
          <Route path="/" element={<PublicRouter><Intro /></PublicRouter>} />
          <Route path="/login" element={<PublicRouter><Login /></PublicRouter>} />
          <Route path="/register" element={<PublicRouter><Register /></PublicRouter>} />
          <Route path="/forgot-password" element={<PublicRouter><ForgotPassword /></PublicRouter>} />

          {/* Onboarding — full screen, outside the AppShell. RequireOnboarding
              keeps already-complete profiles out of it. */}
          <Route
            path="/create-profile"
            element={
              <PrivateRouter>
                <RequireOnboarding>
                  <Profile />
                </RequireOnboarding>
              </PrivateRouter>
            }
          />

          {/* Signed-in app (inside AppShell). */}
          <Route path="/home" element={authed(Home)} />
          <Route path="/pray" element={authed(ChatRoom)} />
          <Route path="/verses" element={authed(Verses)} />
          <Route path="/journal" element={authed(Journal)} />
          <Route path="/settings" element={authed(Settings)} />

          {/* Legacy path → new prayer route. */}
          <Route path="/chat" element={<Navigate to="/pray" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
