import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import LoadingSpinner from "@/components/common/LoadingComponent";

const PrivateRouter = ({ children }) => {
  const { allowUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (allowUser !== undefined) {
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }, [allowUser]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return allowUser ? children : <Navigate to="/login" />;
};

export default PrivateRouter;
