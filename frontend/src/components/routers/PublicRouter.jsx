import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import useUserStore from "@/store/userStore";
import FullScreenLoader from "@/components/common/FullScreenLoader";

// Public routes (landing, login, register). An already-authenticated visitor is
// bounced into the app — to /home if their profile is complete, or to
// /create-profile if they still need to finish onboarding (e.g. a brand-new
// Google sign-in). We wait for both the session and the profile to resolve so
// we route to the right place and don't flash a public page at a signed-in user.
const PublicRouter = ({ children }) => {
  const { allowUser } = useAuth();
  const { isLoading, currentUser } = useUserStore();

  // allowUser is undefined until the first onAuthStateChanged callback.
  if (allowUser === undefined) return <FullScreenLoader />;

  if (allowUser) {
    if (isLoading) return <FullScreenLoader />;
    return (
      <Navigate to={currentUser?.username ? "/home" : "/create-profile"} replace />
    );
  }

  return children;
};

export default PublicRouter;
