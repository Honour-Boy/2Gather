import { Link } from "react-router-dom";
import BrandMark from "@/components/ui/BrandMark";

// Shared shell for the auth screens (login, register, forgot password):
// centered card on the gradient background, with the 2Gather home link.
const AuthLayout = ({ title, subtitle, children, wide = false }) => (
  <div className="min-h-screen w-screen bg-uni-bg text-uni-text font-sans flex items-center justify-center px-4 py-10 relative overflow-hidden">
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-uni-gold/15 blur-3xl" />
      <div className="absolute bottom-0 -right-40 w-[500px] h-[500px] rounded-full bg-uni-blue/15 blur-3xl" />
    </div>

    <div
      className={`w-full ${
        wide ? "max-w-lg" : "max-w-md"
      } bg-uni-surface/85 backdrop-blur-xl border border-uni-border rounded-2xl shadow-card p-7 sm:p-9 animate-fade-in-up`}
    >
      <Link to="/" className="inline-flex items-center gap-2.5 mb-8">
        <BrandMark className="w-10 h-10" />
        <span className="font-display font-semibold tracking-tight">2Gather</span>
      </Link>

      <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-uni-muted mt-2 mb-7 leading-relaxed">{subtitle}</p>
      )}
      {!subtitle && <div className="mb-7" />}

      {children}
    </div>
  </div>
);

export default AuthLayout;
