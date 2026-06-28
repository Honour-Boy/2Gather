import { Navigate } from "react-router-dom";
import useUserStore from "@/store/userStore";
import FullScreenLoader from "@/components/common/FullScreenLoader";

// Profile-completeness gating, layered on top of PrivateRouter's auth check.
// A profile is "complete" once it has a username (set in CreateProfile) — a
// freshly registered or Google-signed-in account only has fullName/email, or
// no profile doc at all, until then.
const hasProfile = (user) => !!user?.username;

// Gate for every signed-in app screen: wait for the profile to load, then send
// half-onboarded accounts to setup before anything in the app renders. This is
// what stops a brand-new Google user from landing on a broken, data-less Home.
export function RequireProfile({ children }) {
  const { isLoading, currentUser } = useUserStore();
  if (isLoading) return <FullScreenLoader label="Loading…" />;
  if (!hasProfile(currentUser)) return <Navigate to="/create-profile" replace />;
  return children;
}

// Gate for the onboarding screen itself: once a profile is complete, don't let
// the user sit on (or navigate back to) /create-profile — send them into the app.
export function RequireOnboarding({ children }) {
  const { isLoading, currentUser } = useUserStore();
  if (isLoading) return <FullScreenLoader label="Loading…" />;
  if (hasProfile(currentUser)) return <Navigate to="/home" replace />;
  return children;
}
