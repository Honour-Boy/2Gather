import { NavLink } from "react-router-dom";
import LogoutNow from "@/components/common/LogoutNow";
import BrandMark from "@/components/ui/BrandMark";

// Persistent app shell: a desktop left rail + a mobile bottom tab bar, with the
// active screen rendered in a single scroll area between them. This is the home
// for every signed-in screen (Home, Pray, Verses, Journal, You).
const TABS = [
  { to: "/home", label: "Home", icon: HomeIcon },
  { to: "/pray", label: "Pray", icon: ChatIcon },
  { to: "/verses", label: "Verses", icon: BookIcon },
  { to: "/journal", label: "Journal", icon: JournalIcon },
  { to: "/settings", label: "You", icon: UserIcon },
];

export default function AppShell({ children }) {
  return (
    <div className="h-screen w-screen flex bg-uni-bg text-uni-text overflow-hidden">
      {/* Desktop left rail */}
      <nav className="hidden md:flex w-20 shrink-0 flex-col items-center justify-between border-r border-uni-border py-5">
        <div className="flex flex-col items-center gap-1.5">
          <NavLink to="/home" aria-label="2Gather home" className="mb-3">
            <BrandMark className="w-10 h-10" />
          </NavLink>
          {TABS.map((t) => (
            <RailItem key={t.to} {...t} />
          ))}
        </div>
        <LogoutNow />
      </nav>

      {/* Content + mobile bottom bar */}
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 min-h-0 overflow-y-auto uni-scroll">{children}</main>
        <nav className="md:hidden shrink-0 flex items-stretch justify-around border-t border-uni-border bg-uni-bg/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
          {TABS.map((t) => (
            <BottomItem key={t.to} {...t} />
          ))}
        </nav>
      </div>
    </div>
  );
}

const RailItem = ({ to, label, icon: Icon }) => (
  <NavLink
    to={to}
    title={label}
    aria-label={label}
    className={({ isActive }) =>
      `w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors ${
        isActive
          ? "bg-brand-soft text-uni-gold"
          : "text-uni-muted hover:text-uni-text hover:bg-black/5"
      }`
    }
  >
    <Icon />
    <span className="text-[9px] font-semibold">{label}</span>
  </NavLink>
);

const BottomItem = ({ to, label, icon: Icon }) => (
  <NavLink
    to={to}
    aria-label={label}
    className={({ isActive }) =>
      `flex-1 min-h-[56px] flex flex-col items-center justify-center gap-1 transition-colors ${
        isActive ? "text-uni-gold" : "text-uni-muted hover:text-uni-text"
      }`
    }
  >
    <Icon />
    <span className="text-[10px] font-semibold">{label}</span>
  </NavLink>
);

/* — Inline SVG tab icons (stroke = currentColor) — */
const sv = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function HomeIcon() {
  return (
    <svg {...sv}>
      <path d="M3 9.5 12 3l9 6.5" />
      <path d="M5 10v10h14V10" />
      <path d="M9.5 20v-6h5v6" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg {...sv}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg {...sv}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
function JournalIcon() {
  return (
    <svg {...sv}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg {...sv}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
