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
import AppShell from "@/components/layout/AppShell";
import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import useUserStore from "@/store/userStore";
import usePresence from "@/hooks/usePresence";
import "./styles/App.css";
import LoadingSpinner from "@/components/common/LoadingComponent";

// Wraps every signed-in screen: waits for the profile to load, forces profile
// setup for half-onboarded accounts, then renders inside the persistent AppShell
// (desktop rail + mobile bottom tabs).
function Authed({ children }) {
  const { isLoading, currentUser } = useUserStore();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-uni-bg w-screen h-screen text-uni-text flex-col gap-3">
        <LoadingSpinner />
        <span className="text-sm text-uni-muted">Loading…</span>
      </div>
    );
  }
  // Authenticated but no profile yet (a freshly registered account has only
  // fullName/email): force profile setup before the app.
  if (currentUser && !currentUser.username) {
    return <Navigate to="/create-profile" replace />;
  }
  return <AppShell>{children}</AppShell>;
}

const authed = (Page) => (
  <PrivateRouter>
    <Authed>
      <Page />
    </Authed>
  </PrivateRouter>
);

function App() {
  const { fetchUserInfo, currentUser } = useUserStore();
  usePresence(currentUser?.id);
  useEffect(() => {
    const unSub = onAuthStateChanged(auth, (user) => {
      if (user) fetchUserInfo(user.uid);
    });
    return () => unSub();
  }, [fetchUserInfo]);

  return (
    <Router>
      <div className="max-h-screen max-w-screen bg-uni-bg font-sans">
        <Routes>
          <Route path="/" element={<PublicRouter><Intro /></PublicRouter>} />
          <Route path="/login" element={<PublicRouter><Login /></PublicRouter>} />
          <Route path="/register" element={<PublicRouter><Register /></PublicRouter>} />
          <Route path="/forgot-password" element={<PublicRouter><ForgotPassword /></PublicRouter>} />

          {/* Onboarding — full screen, outside the AppShell. */}
          <Route path="/create-profile" element={<PrivateRouter><Profile /></PrivateRouter>} />

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
