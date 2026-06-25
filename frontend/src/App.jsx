import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Intro from "./pages/Intro";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/CreateProfile";
import ForgotPassword from "./pages/ForgotPassword";
import ChatRoom from "./pages/ChatRoom";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import PrivateRouter from "@/components/routers/PrivateRouter";
import PublicRouter from "@/components/routers/PublicRouter";
import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import useUserStore from "@/store/userStore";
import usePresence from "@/hooks/usePresence";
import "./styles/App.css";
import LoadingSpinner from "@/components/common/LoadingComponent";

function App() {
  const { isLoading, fetchUserInfo, currentUser } = useUserStore();
  usePresence(currentUser?.id);
  useEffect(() => {
    const unSub = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserInfo(user.uid);
      }
    });

    return () => {
      unSub();
    };
  }, [fetchUserInfo]);

  return (
    <Router>
      <div className="max-h-screen max-w-screen bg-uni-bg font-sans">
        <Routes>
          <Route
            path="/"
            element={
              <PublicRouter>
                <Intro />
              </PublicRouter>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRouter>
                <Login />
              </PublicRouter>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRouter>
                <Register />
              </PublicRouter>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRouter>
                <ForgotPassword />
              </PublicRouter>
            }
          />
          <Route
            path="/create-profile"
            element={
              <PrivateRouter>
                <Profile />
              </PrivateRouter>
            }
          />
          <Route
            path="/chat"
            element={
              <PrivateRouter>
                {isLoading ? (
                  <div className="flex items-center justify-center bg-uni-bg w-screen h-screen text-uni-text flex-col gap-3">
                    <LoadingSpinner />
                    <span className="text-sm text-uni-muted">Loading…</span>
                  </div>
                ) : currentUser && !currentUser.username ? (
                  // Authenticated but no profile yet (a freshly registered
                  // account has only fullName/email): force profile setup before
                  // chat, so a new user can't slip into the app half-onboarded.
                  <Navigate to="/create-profile" replace />
                ) : (
                  <ChatRoom />
                )}
              </PrivateRouter>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRouter>
                <Settings />
              </PrivateRouter>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
