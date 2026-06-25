import { useNavigate } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";

function Intro() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="w-screen min-h-screen max-h-screen overflow-y-auto bg-uni-bg text-uni-text font-sans uni-scroll">
      {/* Ambient electric orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-uni-lime/15 blur-3xl animate-float" />
        <div className="absolute top-1/3 -right-40 w-[520px] h-[520px] rounded-full bg-uni-cyan/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[420px] h-[420px] rounded-full bg-uni-magenta/10 blur-3xl" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-uni-bg/80 border-b border-uni-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-bubble">
              <span className="text-uni-on-accent font-display font-bold text-lg">
                U
              </span>
            </div>
            <span className="text-lg font-display font-bold tracking-tight">
              Unicomm
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-uni-muted">
            <a href="#features" className="hover:text-white transition-colors">
              {t("nav.features")}
            </a>
            <a
              href="#how-it-works"
              className="hover:text-white transition-colors"
            >
              {t("nav.howItWorks")}
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              {t("nav.pricing")}
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <button
              onClick={() => navigate("/login")}
              className="hidden sm:block px-4 py-2 text-sm font-medium text-uni-text hover:text-white transition-colors"
            >
              {t("nav.login")}
            </button>
            <button
              onClick={() => navigate("/register")}
              className="px-3 sm:px-4 py-2 text-sm font-bold text-uni-on-accent rounded-lg bg-brand shadow-bubble hover:shadow-glow transition-all whitespace-nowrap"
            >
              {t("nav.getStarted")}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-uni-surface border border-uni-border text-xs font-medium text-uni-muted mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-uni-lime animate-pulse-dot" />
          {t("intro.badge")}
        </div>

        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] max-w-4xl mx-auto">
          <Trans
            i18nKey="intro.heroTitle"
            components={{
              grad: (
                <span className="bg-brand bg-clip-text text-transparent" />
              ),
            }}
          />
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-uni-muted max-w-2xl mx-auto leading-relaxed">
          {t("intro.heroSubtitle")}
        </p>

        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate("/register")}
            className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-uni-on-accent rounded-xl bg-brand shadow-bubble hover:shadow-glow transition-all"
          >
            {t("intro.startFree")}
          </button>
          <button
            onClick={() => navigate("/login")}
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white rounded-xl bg-uni-surface border border-uni-border hover:border-uni-lime/40 hover:bg-uni-surface2 transition-colors"
          >
            {t("intro.haveAccount")}
          </button>
        </div>

        {/* Chat preview mockup */}
        <div className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <div className="rounded-3xl border border-uni-border bg-uni-surface/60 backdrop-blur-sm shadow-2xl overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-uni-border">
              <span className="w-2.5 h-2.5 rounded-full bg-uni-magenta/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-uni-lime/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-uni-cyan/70" />
              <span className="ml-3 text-xs text-uni-muted">Mei · EN → JA</span>
            </div>
            <div className="p-6 space-y-3 text-left">
              <div className="flex justify-start">
                <div className="max-w-[70%]">
                  <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-uni-surface border border-uni-border text-sm text-uni-text">
                    こんにちは！プロジェクトの件で話せますか？
                  </div>
                  <p className="text-[11px] text-uni-muted mt-1">
                    {t("intro.previewTranslatedFrom")}
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="max-w-[70%] flex flex-col items-end">
                  <div className="px-4 py-2.5 rounded-2xl rounded-br-md bg-brand text-uni-on-accent font-medium text-sm shadow-bubble">
                    Of course — let me share the latest mockups.
                  </div>
                  <p className="text-[11px] text-uni-muted mt-1">
                    {t("intro.previewTranslatedTo")}
                  </p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[70%]">
                  <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-uni-surface border border-uni-border text-sm text-uni-text">
                    完璧。ありがとう！
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
            {t("intro.featuresTitle")}
          </h2>
          <p className="mt-3 text-uni-muted max-w-xl mx-auto">
            {t("intro.featuresSubtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FeatureCard
            title={t("intro.feature1Title")}
            description={t("intro.feature1Desc")}
            icon={
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m5 8 6 6" />
                <path d="m4 14 6-6 2-3" />
                <path d="M2 5h12" />
                <path d="M7 2h1" />
                <path d="m22 22-5-10-5 10" />
                <path d="M14 18h6" />
              </svg>
            }
          />
          <FeatureCard
            title={t("intro.feature2Title")}
            description={t("intro.feature2Desc")}
            icon={
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
          <FeatureCard
            title={t("intro.feature3Title")}
            description={t("intro.feature3Desc")}
            icon={
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            }
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {t("intro.howTitle")}
          </h2>
          <p className="mt-3 text-uni-muted max-w-xl mx-auto">
            {t("intro.howSubtitle")}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StepCard
            n="01"
            title={t("intro.step1Title")}
            body={t("intro.step1Body")}
          />
          <StepCard
            n="02"
            title={t("intro.step2Title")}
            body={t("intro.step2Body")}
          />
          <StepCard
            n="03"
            title={t("intro.step3Title")}
            body={t("intro.step3Body")}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-3xl border border-uni-border bg-brand-soft p-10 md:p-14 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {t("intro.ctaTitle")}
          </h2>
          <p className="mt-3 text-uni-muted max-w-lg mx-auto">
            {t("intro.ctaSubtitle")}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate("/register")}
              className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-uni-on-accent rounded-xl bg-brand shadow-bubble hover:shadow-glow transition-all"
            >
              {t("intro.createAccount")}
            </button>
            <button
              onClick={() => navigate("/login")}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white rounded-xl bg-uni-surface border border-uni-border hover:border-uni-lime/40 hover:bg-uni-surface2 transition-colors"
            >
              {t("intro.startChatting")}
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
                U
              </span>
            </div>
            <span>© {new Date().getFullYear()} Unicomm</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white transition-colors">
              {t("intro.footerPrivacy")}
            </a>
            <a href="#" className="hover:text-white transition-colors">
              {t("intro.footerTerms")}
            </a>
            <a href="#" className="hover:text-white transition-colors">
              {t("intro.footerContact")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const FeatureCard = ({ icon, title, description }) => (
  <div className="group p-6 rounded-2xl border border-uni-border bg-uni-surface/60 hover:bg-uni-surface hover:border-uni-lime/40 transition-all">
    <div className="w-11 h-11 rounded-xl bg-brand-soft border border-uni-lime/20 flex items-center justify-center text-uni-lime mb-4 group-hover:scale-105 transition-transform">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    <p className="mt-1.5 text-sm text-uni-muted leading-relaxed">
      {description}
    </p>
  </div>
);

const StepCard = ({ n, title, body }) => {
  const { t } = useTranslation();
  return (
    <div className="p-6 rounded-2xl border border-uni-border bg-uni-surface/60 hover:border-uni-lime/30 transition-colors">
      <span className="font-display text-xs font-bold tracking-widest text-uni-lime">
        {t("intro.step")} {n}
      </span>
      <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm text-uni-muted leading-relaxed">{body}</p>
    </div>
  );
};

export default Intro;
