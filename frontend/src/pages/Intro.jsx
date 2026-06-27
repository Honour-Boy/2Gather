import { useNavigate } from "react-router-dom";
import VerseOfTheDay from "@/components/verses/VerseOfTheDay";

function Intro() {
  const navigate = useNavigate();

  return (
    <div className="w-screen min-h-screen max-h-screen overflow-y-auto bg-uni-bg text-uni-text font-sans uni-scroll">
      {/* Warm ambient halos (gold + soft blue), like candle / window light */}
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
            <span className="text-lg font-display font-semibold tracking-tight">
              2Gather
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-uni-muted">
            <a href="#why" className="hover:text-uni-text transition-colors">
              Why 2Gather
            </a>
            <a href="#how-it-works" className="hover:text-uni-text transition-colors">
              How it works
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate("/login")}
              className="hidden sm:block px-4 py-2 text-sm font-medium text-uni-muted hover:text-uni-text transition-colors"
            >
              Log in
            </button>
            <button
              onClick={() => navigate("/register")}
              className="px-3 sm:px-4 py-2 text-sm font-bold text-uni-on-accent rounded-lg bg-brand shadow-bubble hover:shadow-glow transition-all whitespace-nowrap"
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-uni-surface border border-uni-border text-xs font-medium text-uni-muted mb-6">
          <CrossIcon className="w-3.5 h-3.5 text-uni-gold" />
          Faith-based togetherness
        </div>

        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.1] max-w-4xl mx-auto">
          You were never meant to{" "}
          <span className="bg-brand bg-clip-text text-transparent">
            pray alone
          </span>
          .
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-uni-muted max-w-2xl mx-auto leading-relaxed">
          Some weeks are heavy. 2Gather is a quiet place to bring it to God — and
          to people who will stand with you — with real prayer, Scripture for the
          moment you&apos;re in, and friends a message away.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate("/register")}
            className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-uni-on-accent rounded-xl bg-brand shadow-bubble hover:shadow-glow transition-all"
          >
            Start praying free
          </button>
          <button
            onClick={() => navigate("/login")}
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-uni-text rounded-xl bg-uni-surface border border-uni-border hover:border-uni-gold/50 hover:bg-uni-surface2 transition-colors"
          >
            I have an account
          </button>
        </div>

        {/* The real verse of the day — a taste of the app, live from the API. */}
        <div className="mt-14 max-w-xl mx-auto text-left">
          <VerseOfTheDay />
        </div>
      </section>

      {/* Why 2Gather */}
      <section id="why" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            A few reasons people gather here
          </h2>
          <p className="mt-3 text-uni-muted max-w-xl mx-auto">
            Not another app to manage — a place to be carried, and to carry others.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FeatureCard
            title="Carry it together"
            description="Share what's weighing on you and have someone pray with you in the moment — not days later. Burdens get lighter when they're shared."
            icon={<HeartIcon />}
          />
          <FeatureCard
            title="God in the everyday"
            description="A verse for the commute, the interview, the hospital wait. Scripture that meets the exact moment you're walking through — never paraphrased, always attributed."
            icon={<BookIcon />}
          />
          <FeatureCard
            title="Prayer you'll keep"
            description="Save the verses and prayers that steady you to your journal, and get a gentle daily nudge to come back and breathe."
            icon={<BookmarkIcon />}
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Simple enough to start today
          </h2>
          <p className="mt-3 text-uni-muted max-w-xl mx-auto">
            Three small steps — then just show up as you are.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StepCard
            n="01"
            title="Make it yours"
            body="Sign up and choose a mode for what you're walking through — travel, an interview, recovery, or just everyday."
          />
          <StepCard
            n="02"
            title="Pray in real time"
            body="Send a prayer or a verse to a friend in a warm, focused chat. Together, even when you're apart."
          />
          <StepCard
            n="03"
            title="Come back to it"
            body="Keep what spoke to you in your journal, and let a daily verse meet you where you are."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-3xl border border-uni-gold/20 bg-brand-soft p-10 md:p-14 text-center">
          <CrossIcon className="w-7 h-7 text-uni-gold mx-auto mb-4" />
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            You don&apos;t have to pray alone tonight
          </h2>
          <p className="mt-3 text-uni-muted max-w-lg mx-auto">
            Whatever you&apos;re carrying, bring it here. Start with a verse, a
            prayer, or just a hello.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate("/register")}
              className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-uni-on-accent rounded-xl bg-brand shadow-bubble hover:shadow-glow transition-all"
            >
              Create your space
            </button>
            <button
              onClick={() => navigate("/login")}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-uni-text rounded-xl bg-uni-surface border border-uni-border hover:border-uni-gold/50 hover:bg-uni-surface2 transition-colors"
            >
              Start praying
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
          <span className="text-uni-muted">Pray together, wherever you are.</span>
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
    <p className="mt-1.5 text-sm text-uni-muted leading-relaxed">{description}</p>
  </div>
);

const StepCard = ({ n, title, body }) => (
  <div className="p-6 rounded-2xl border border-uni-border bg-uni-surface hover:border-uni-gold/30 transition-colors">
    <span className="text-[11px] font-semibold uppercase tracking-widest text-uni-gold">
      Step {n}
    </span>
    <h3 className="mt-2 text-lg font-semibold text-uni-text">{title}</h3>
    <p className="mt-1.5 text-sm text-uni-muted leading-relaxed">{body}</p>
  </div>
);

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

const BookmarkIcon = () => (
  <svg {...iconProps}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
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
