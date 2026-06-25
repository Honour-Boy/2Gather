import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import useChatStore from "@/store/chatStore";
import useUserStore from "@/store/userStore";
import { auth } from "@/lib/firebase";

const LogoutNow = () => {
  const { setAllowUser } = useAuth();
  const { resetChat } = useChatStore();
  const { clearUserInfo } = useUserStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const logoutFunc = () => {
    resetChat();
    // Signing out flips `allowUser` via onAuthStateChanged; setAllowUser keeps
    // the UI immediate.
    auth.signOut();
    setAllowUser(false);
    navigate("/");
    clearUserInfo();
  };

  return (
    <button
      onClick={logoutFunc}
      title={t("navbar.logout")}
      aria-label={t("navbar.logout")}
      className="group relative w-10 h-10 rounded-xl flex items-center justify-center text-uni-muted hover:text-red-300 hover:bg-red-500/10 transition-colors"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      <span className="absolute left-full ml-3 px-2.5 py-1 text-xs bg-uni-surface text-white rounded-md whitespace-nowrap border border-uni-border shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-30">
        {t("navbar.logout")}
      </span>
    </button>
  );
};

export default LogoutNow;
