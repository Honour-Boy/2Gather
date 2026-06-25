import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useUserStore from "@/store/userStore";
import Avatar from "@/components/ui/Avatar";
import LogoutNow from "@/components/common/LogoutNow";

const Userinfo = () => {
  const { currentUser } = useUserStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between px-4 py-4 border-b border-uni-border">
      <button
        onClick={() => navigate("/settings")}
        className="flex items-center gap-3 min-w-0 rounded-lg p-1 -m-1 hover:bg-uni-surface/60 transition-colors text-left"
        aria-label={t("settings.editProfile")}
      >
        <Avatar user={currentUser} small className="text-sm" />
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] uppercase tracking-wider text-uni-muted font-semibold">
            Unicomm
          </span>
          <h2 className="text-base font-semibold text-white truncate">
            {currentUser?.fullName?.split(" ")[0] || "You"}
          </h2>
        </div>
      </button>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => navigate("/settings")}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-uni-muted hover:text-white hover:bg-uni-surface transition-colors"
          aria-label={t("settings.editProfile")}
          title={t("settings.editProfile")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        {/* Logout is in the desktop side-rail (Navbar), which is hidden on
            mobile — surface it here so phone users can sign out. */}
        <span className="md:hidden">
          <LogoutNow />
        </span>
      </div>
    </div>
  );
};

export default Userinfo;
