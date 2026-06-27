import LoadingSpinner from "@/components/common/LoadingComponent";

// Centered full-frame loading state used by the route guards while auth/profile
// state resolves, so the app never flashes the wrong screen underneath. Fills
// its parent (the dvh app frame) rather than a 100vh box.
const FullScreenLoader = ({ label }) => (
  <div className="flex flex-col items-center justify-center gap-3 h-full w-full bg-uni-bg text-uni-text">
    <LoadingSpinner />
    {label && <span className="text-sm text-uni-muted">{label}</span>}
  </div>
);

export default FullScreenLoader;
