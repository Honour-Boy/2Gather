import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const PublicRouter = ({ children }) => {
  const { allowUser } = useAuth();

  if (allowUser) {
    return <Navigate to={"/home"} />;
  }

  return children;
};

export default PublicRouter;
