import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import FullScreenLoader from "@/components/common/FullScreenLoader";

// Session gate for protected routes. allowUser is undefined until the first
// onAuthStateChanged callback resolves — show a loader until then so we don't
// flash the login screen at an already-signed-in user. Profile-completeness is
// gated separately by RequireProfile.
const PrivateRouter = ({ children }) => {
  const { allowUser } = useAuth();

  if (allowUser === undefined) return <FullScreenLoader />;

  return allowUser ? children : <Navigate to="/login" replace />;
};

export default PrivateRouter;
