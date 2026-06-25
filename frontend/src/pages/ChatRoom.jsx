import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Chat, Detail, List } from "@/components/chat";
import useChatStore from "@/store/chatStore";
import Navbar from "@/components/common/Navbar";

const EmptyChatState = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-full w-full text-center px-6">
      <div className="w-20 h-20 rounded-3xl bg-brand-soft border border-uni-lime/20 flex items-center justify-center mb-5">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#C6FF3D"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-white">
        {t("chatRoom.selectTitle")}
      </h2>
      <p className="text-sm text-uni-muted mt-2 max-w-sm">
        {t("chatRoom.selectBody")}
      </p>
    </div>
  );
};

const ChatRoom = () => {
  const { chatId, isCurrentUserBlocked } = useChatStore();
  const [detailOpen, setDetailOpen] = useState(false);
  const { t } = useTranslation();

  const hasChat = !!chatId;
  const toggleDetail = () => setDetailOpen((prev) => !prev);
  const closeDetail = () => setDetailOpen(false);

  return (
    <div className="bg-uni-bg text-uni-text h-screen flex w-screen overflow-hidden">
      <Navbar />

      <div className="flex flex-1 min-w-0 relative">
        {/* Sidebar */}
        <aside
          className={`${
            hasChat ? "hidden md:flex" : "flex"
          } flex-col w-full md:w-[340px] lg:w-[380px] border-r border-uni-border bg-uni-bg min-w-0`}
        >
          <List />
        </aside>

        {/* Main chat panel */}
        <main
          className={`${
            hasChat ? "flex" : "hidden md:flex"
          } flex-1 min-w-0 flex-col relative`}
        >
          {!hasChat ? (
            <EmptyChatState />
          ) : isCurrentUserBlocked ? (
            <div className="flex items-center justify-center w-full h-full text-uni-muted flex-col gap-2">
              {t("chatRoom.blocked")}
            </div>
          ) : (
            <Chat onHeaderClick={toggleDetail} detailOpen={detailOpen} />
          )}
        </main>

        {/* Collapsible detail panel */}
        {hasChat && !isCurrentUserBlocked && (
          <>
            {/* Mobile backdrop */}
            <div
              onClick={closeDetail}
              className={`md:hidden fixed inset-0 bg-black/60 z-30 transition-opacity ${
                detailOpen
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
              }`}
            />
            <aside
              className={`fixed md:relative top-0 right-0 h-full w-[320px] max-w-[85vw] bg-uni-bg border-l border-uni-border z-40 transform transition-transform duration-300 ease-out ${
                detailOpen ? "translate-x-0" : "translate-x-full md:hidden"
              }`}
            >
              <Detail onClose={closeDetail} />
            </aside>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatRoom;
