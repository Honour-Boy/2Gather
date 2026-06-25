import { useEffect, useState } from "react";
import {
  arrayRemove,
  arrayUnion,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import useChatStore from "@/store/chatStore";
import { db } from "@/lib/firebase";
import useUserStore from "@/store/userStore";
import languages from "@/components/common/Languages";
import { isUserOnline } from "@/hooks/usePresence";
import { format } from "timeago.js";
import { useTranslation } from "react-i18next";
import Avatar from "@/components/ui/Avatar";

const Detail = ({ onClose }) => {
  const { user, isCurrentUserBlocked, isReceiverBlocked, changeBlock } =
    useChatStore();
  const { currentUser } = useUserStore();
  const { t } = useTranslation();
  const [liveUser, setLiveUser] = useState(user);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = onSnapshot(doc(db, "users", user.id), (snap) => {
      if (snap.exists()) setLiveUser({ ...snap.data(), id: user.id });
    });
    return () => unsub();
  }, [user?.id]);

  const online = isUserOnline(liveUser);

  const handleBlock = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", currentUser.id), {
        blocked: isReceiverBlocked ? arrayRemove(user.id) : arrayUnion(user.id),
      });
      changeBlock();
    } catch (err) {
      console.log(err);
    }
  };

  const langLabel =
    languages.find((l) => l.value === user?.language)?.label || t("common.dash");

  const lastSeenText = (() => {
    const ls = liveUser?.lastSeen;
    if (!ls) return t("common.offline");
    const ts =
      typeof ls?.toMillis === "function"
        ? ls.toMillis()
        : ls?.seconds
        ? ls.seconds * 1000
        : null;
    return ts
      ? t("common.lastSeen", { time: format(new Date(ts)) })
      : t("common.offline");
  })();

  return (
    <div className="flex flex-col h-full text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-uni-border">
        <h3 className="text-sm font-semibold text-uni-muted uppercase tracking-wider">
          {t("detail.profile")}
        </h3>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-uni-muted hover:text-white hover:bg-uni-surface transition-colors"
          aria-label={t("common.close")}
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Profile */}
      <div className="flex flex-col items-center text-center px-6 py-6 border-b border-uni-border">
        <Avatar user={liveUser || user} className="!w-20 !h-20 text-2xl" />
        <h2 className="mt-3 text-lg font-semibold">{user?.fullName}</h2>
        <p className="text-sm text-uni-muted">{user?.username}</p>
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              online ? "bg-uni-online animate-pulse-dot" : "bg-uni-muted/50"
            }`}
          />
          <span className={online ? "text-uni-online" : "text-uni-muted"}>
            {online ? t("common.online") : lastSeenText}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 overflow-y-auto uni-scroll px-6 py-5 space-y-4">
        <InfoRow label={t("common.email")} value={user?.email} />
        <InfoRow label={t("common.language")} value={langLabel} />
        <InfoRow label={t("common.jobTitle")} value={user?.jobTitle || t("common.dash")} />
        <InfoRow label={t("common.organization")} value={user?.organization || t("common.dash")} />
        <div>
          <p className="text-xs font-semibold text-uni-muted uppercase tracking-wider mb-1">
            {t("common.bio")}
          </p>
          <p className="text-sm text-uni-text leading-relaxed" translate="no">
            {user?.bio || t("detail.noBio")}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-uni-border">
        <button
          onClick={handleBlock}
          disabled={isCurrentUserBlocked}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            isReceiverBlocked
              ? "bg-uni-surface border border-uni-border text-white hover:bg-uni-surface2"
              : "bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isCurrentUserBlocked
            ? t("detail.youAreBlocked")
            : isReceiverBlocked
            ? t("detail.unblockUser")
            : t("detail.blockUser")}
        </button>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div>
    <p className="text-xs font-semibold text-uni-muted uppercase tracking-wider mb-1">
      {label}
    </p>
    <p className="text-sm text-uni-text break-words">{value}</p>
  </div>
);

export default Detail;
