import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LogoutNow from "./LogoutNow";

const Navbar = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <nav className="hidden md:flex w-16 lg:w-20 h-screen flex-col items-center justify-between bg-uni-bg border-r border-uni-border py-5">
      <div className="flex flex-col items-center gap-6">
        {/* Brand mark */}
        <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-bubble">
          <span className="text-uni-on-accent font-display font-bold text-lg">U</span>
        </div>

        <NavIcon label={t("navbar.chats")} active onClick={() => navigate("/chat")}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </NavIcon>

        <NavIcon label={t("navbar.profile")} onClick={() => navigate("/settings")}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </NavIcon>
      </div>
      <div className="flex flex-col items-center">
        <LogoutNow />
      </div>
    </nav>
  );
};

const NavIcon = ({ children, label, active, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative flex items-center justify-center cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onClick}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
          active
            ? "bg-brand-soft text-uni-lime"
            : "text-uni-muted hover:text-white hover:bg-white/5"
        }`}
      >
        {children}
      </button>
      {hovered && (
        <span className="absolute top-1/2 -translate-y-1/2 left-full ml-3 px-2.5 py-1 text-xs bg-uni-surface text-white rounded-md whitespace-nowrap border border-uni-border shadow-lg z-30">
          {label}
        </span>
      )}
    </div>
  );
};

export default Navbar;
