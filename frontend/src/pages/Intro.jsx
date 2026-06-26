import { useNavigate } from "react-router-dom";

function Intro() {
  const navigate = useNavigate();

  return (
    <div className="w-screen min-h-screen max-h-screen overflow-y-auto bg-uni-bg text-uni-text font-sans uni-scroll">
      {/* Warm ambient halos (gold + soft blue), like cand- / window-light */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-uni-gold/15 blur-3xl animate-float" />
        <div className="absolute top-1/3 -right-40 w-[520px] h-[520px] rounded-full bg-uni-blue/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[420px] h-[420px] rounded-full bg-uni-glow/15 blur-3xl" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-uni-bg/80 border-b border-uni-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-bubble">
              <span className="text-uni-on-accent font-display font-bold text-lg">
                2
              </span>
            </div>
            <span className="text-lg font-display font-bold tracking-tight">
              2Gather
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-uni-muted">
            <a href="#features" className="hover:text-uni-text transition-colors">
              {"Features"}
            </a>
            <a
              href="#how-it-works"
              className="hover:text-uni-text transition-colors"
            >
              {"How it works"}
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate("/login")}
              className="hidden sm:block px-4 py-2 text-sm font-medium text-uni-muted hover:text-uni-text transition-colors"
            >
              {"Log in"}
            </button>
            <button
              onClick={() => navigate("/register")}
              className="px-3 sm:px-4 py-2 text-sm font-bold text-uni-on-accent rounded-lg bg-brand shadow-bubble hover:shadow-glow transition-all whitespace-nowrap"
            >
              {"Get started"}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-uni-surface border border-uni-border text-xs font-medium text-uni-muted mb-6">
          <CrossIcon className="w-3.5 h-3.5 text-uni-gold" />
          {"Faith-based togetherness · now in beta"}
        </div>

        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] max-w-4xl mx-auto">
          Pray together,{" "}
          <span className="bg-brand bg-clip-text text-transparent">
            wherever you are
          </span>
          .
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-uni-muted max-w-2xl mx-auto leading-relaxed">
          {"2Gather brings prayer, Scripture, and encouragement into one warm space — real-time prayer chat, a themed Bible verse for each day, and modes for whatever you're walking through."}
        </p>

        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate("/register")}
            className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-uni-on-accent rounded-xl bg-brand shadow-bubble hover:shadow-glow transition-all"
          >
            {"Start praying free"}
          </button>
          <button
            onClick={() => navigate("/login")}
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-uni-text rounded-xl bg-uni-surface border border-uni-border hover:border-uni-gold/50 hover:bg-uni-surface2 transition-colors"
          >
            {"I have an account"}
          </button>
        </div>

        {/* Prayer-room preview mockup */}
        <div className="mt-16 md:mt-20 max-w-2xl mx-auto">
          <div className="rounded-3xl border border-uni-border bg-uni-surface shadow-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-uni-border">
              <span className="w-2 h-2 rounded-full bg-uni-gold animate-pulse-dot" />
              <span className="text-xs font-semibold text-uni-text">
                {"Prayer room"}
              </span>
              <span className="ml-auto text-[11px] text-uni-muted">
                {"Recovery mode"}
              </span>
            </div>
            <div className="p-5 sm:p-6 space-y-3 text-left">
              {/* Verse of the day */}
              <div className="rounded-2xl bg-brand-soft border border-uni-gold/25 p-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-uni-gold" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-uni-gold">
                    {"Verse of the day"}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-uni-text">
                  “{"Come to me, all you who labor and are heavily burdened, and I will give you rest."}”
                </p>
                <p className="mt-1 text-xs text-uni-muted">
                  — {"Matthew 11:28"}{" "}
                  <span className="opacity-60">(WEB)</span>
                </p>
              </div>

              {/* Prayer request from a friend */}
              <div className="flex justify-start">
                <div className="max-w-[78%] px-4 py-2.5 rounded-2xl rounded-bl-md bg-uni-surface2 border border-uni-border text-sm text-uni-text">
                  {"Resting after a long week 🙏 could you pray for some peace?"}
                </div>
              </div>

              {/* A prayer in reply */}
              <div className="flex justify-end">
                <div className="max-w-[78%] flex flex-col items-end">
                  <span className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-uni-gold">
                    <span className="w-1.5 h-1.5 rounded-full bg-uni-gold" />
                    {"Prayer"}
                  </span>
                  <div className="px-4 py-2.5 rounded-2xl rounded-br-md bg-brand text-uni-on-accent font-medium text-sm shadow-bubble ring-1 ring-uni-gold/30">
                    {"Lord, quiet their mind and restore their strength. Give them true rest. Amen."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {"Everything you need to pray together"}
          </h2>
          <p className="mt-3 text-uni-muted max-w-xl mx-auto">
            {"Warm, reverent, and built for real life — in your language and theirs."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FeatureCard
            title={"Real-time prayer chat"}
            description={"Share a request and pray together the moment it matters — send a prayer, not just a message."}
            icon={<HeartIcon />}
          />
          <FeatureCard
            title={"A verse for every day"}
            description={"A curated, attributed Bible verse each day (World English Bible), themed to what you're carrying."}
            icon={<BookIcon />}
          />
          <FeatureCard
            title={"Modes for real life"}
            description={"Travel, Interview, Pitch, Promotion, Recovery — each reshapes your verses, prayers, and gentle nudges."}
            icon={<CompassIcon />}
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {"How 2Gather works"}
          </h2>
          <p className="mt-3 text-uni-muted max-w-xl mx-auto">
            {"Three steps to praying together."}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StepCard
            n="01"
            title={"Create your space"}
            body={"Sign up, set your name, and choose a mode for whatever you're walking through."}
          />
          <StepCard
            n="02"
            title={"Pray in real time"}
            body={"Send prayers and Scripture in a warm, focused chat — together, even when you're apart."}
          />
          <StepCard
            n="03"
            title={"Carry it with you"}
            body={"Save what speaks to you in your journal, and get a gentle daily verse nudge."}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-3xl border border-uni-gold/20 bg-brand-soft p-10 md:p-14 text-center">
          <CrossIcon className="w-7 h-7 text-uni-gold mx-auto mb-4" />
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {"Ready to gather in prayer?"}
          </h2>
          <p className="mt-3 text-uni-muted max-w-lg mx-auto">
            {"Join 2Gather and bring faith, friends, and Scripture into one place."}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate("/register")}
              className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-uni-on-accent rounded-xl bg-brand shadow-bubble hover:shadow-glow transition-all"
            >
              {"Create account"}
            </button>
            <button
              onClick={() => navigate("/login")}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-uni-text rounded-xl bg-uni-surface border border-uni-border hover:border-uni-gold/50 hover:bg-uni-surface2 transition-colors"
            >
              {"Start praying"}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-uni-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-uni-muted">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand flex items-center justify-center">
              <span className="text-uni-on-accent font-display font-bold text-xs">
                2
              </span>
            </div>
            <span>© {new Date().getFullYear()} 2Gather</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-uni-text transition-colors">
              {"Privacy"}
            </a>
            <a href="#" className="hover:text-uni-text transition-colors">
              {"Terms"}
            </a>
            <a href="#" className="hover:text-uni-text transition-colors">
              {"Contact"}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const FeatureCard = ({ icon, title, description }) => (
  <div className="group p-6 rounded-2xl border border-uni-border bg-uni-surface hover:border-uni-gold/40 hover:shadow-card transition-all">
    <div className="w-11 h-11 rounded-xl bg-brand-soft border border-uni-gold/20 flex items-center justify-center text-uni-gold mb-4 group-hover:scale-105 transition-transform">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-uni-text">{title}</h3>
    <p className="mt-1.5 text-sm text-uni-muted leading-relaxed">
      {description}
    </p>
  </div>
);

const StepCard = ({ n, title, body }) => {
  return (
    <div className="p-6 rounded-2xl border border-uni-border bg-uni-surface hover:border-uni-gold/30 transition-colors">
      <span className="font-display text-xs font-bold tracking-widest text-uni-gold">
        {"STEP"} {n}
      </span>
      <h3 className="mt-2 text-lg font-semibold text-uni-text">{title}</h3>
      <p className="mt-1.5 text-sm text-uni-muted leading-relaxed">{body}</p>
    </div>
  );
};

/* — Faith-themed line icons (stroke = currentColor) — */
const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const HeartIcon = () => (
  <svg {...iconProps}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const BookIcon = () => (
  <svg {...iconProps}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const CompassIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

const CrossIcon = ({ className = "" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v18" />
    <path d="M7 8h10" />
  </svg>
);

export default Intro;
