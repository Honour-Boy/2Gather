import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useUserStore from "@/store/userStore";
import useModeStore from "@/store/modeStore";
import {
  MODES,
  getMode,
  themeForMode,
  accentForMode,
  headlineForMode,
} from "@/lib/modes";
import { fetchPrayerTemplates } from "@/lib/prayerTemplates";
import VerseOfTheDay from "@/components/verses/VerseOfTheDay";
import { saveVerseToJournal, savePrayerToJournal } from "@/services/journal";
import notify from "@/lib/toast";
import Toaster from "@/components/ui/Toaster";

// Modes-first home: "What are you walking through today?" Pick a Mode and a
// tailored space opens — a themed verse of the day and a few prayer prompts,
// with one tap to pray with someone. The hub of the app.
export default function Home() {
  const navigate = useNavigate();
  const { currentUser } = useUserStore();
  const { activeMode, setMode, clearMode } = useModeStore();
  const uid = currentUser?.id;

  const [templates, setTemplates] = useState([]);
  const theme = themeForMode(activeMode);
  const mode = getMode(activeMode);
  const accent = accentForMode(activeMode);
  const headline = headlineForMode(activeMode);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();
  const firstName = currentUser?.fullName?.split(" ")[0] || "friend";

  useEffect(() => {
    let active = true;
    fetchPrayerTemplates({ theme })
      .then((list) => active && setTemplates(list.slice(0, 3)))
      .catch(() => active && setTemplates([]));
    return () => {
      active = false;
    };
  }, [theme]);

  const saveVerse = async (verse) => {
    if (!uid) return;
    try {
      await saveVerseToJournal(uid, { ...verse, mode: activeMode || null });
      notify.success("Saved to your journal.");
    } catch {
      notify.error("Couldn't save. Please try again.");
    }
  };

  const savePrayer = async (body) => {
    if (!uid) return;
    try {
      await savePrayerToJournal(uid, body, activeMode || null);
      notify.success("Saved to your journal.");
    } catch {
      notify.error("Couldn't save. Please try again.");
    }
  };

  return (
    <div className="min-h-full px-4 sm:px-6 lg:px-10 py-6 md:py-10">
      <Toaster />
      <div className="max-w-3xl mx-auto">
        <p className="text-sm text-uni-muted">{greeting}, {firstName}.</p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          What are you walking through today?
        </h1>
        <p className="mt-2 text-uni-muted">
          Choose where you are — and meet Scripture and prayer for that moment.
        </p>

        {/* Mode picker */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <ModeCard
            label="Just here"
            description="A general space"
            accent={accentForMode(null)}
            active={!activeMode}
            onClick={clearMode}
          />
          {MODES.map((m) => (
            <ModeCard
              key={m.id}
              label={m.label}
              description={m.description}
              accent={m.accent}
              active={activeMode === m.id}
              onClick={() => setMode(m.id)}
            />
          ))}
        </div>

        {/* Tailored space */}
        <section className="mt-8">
          <div className="flex items-center gap-2.5">
            <span
              className="h-5 w-1 rounded-full"
              style={{ backgroundColor: accent }}
              aria-hidden="true"
            />
            <h2 className="font-display text-xl font-semibold">
              {mode ? `Your ${mode.label} space` : "For wherever you are"}
            </h2>
          </div>

          {/* Per-Mode headline — a reverent line that meets the moment. */}
          {headline && (
            <div
              className="mt-3 rounded-2xl p-3.5"
              style={{
                backgroundColor: `${accent}14`,
                border: `1px solid ${accent}33`,
              }}
            >
              <p className="text-sm text-uni-text leading-relaxed">{headline}</p>
            </div>
          )}

          <div className="mt-4">
            <VerseOfTheDay
              key={theme || "general"}
              theme={theme}
              onSave={uid ? saveVerse : undefined}
            />
          </div>

          {templates.length > 0 && (
            <div className="mt-5">
              <p
                className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                style={{ color: accent }}
              >
                Prayer prompts
              </p>
              <div className="space-y-2.5">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="rounded-2xl border border-uni-border bg-uni-surface p-4"
                  >
                    <p className="text-sm font-semibold text-uni-text">{tpl.title}</p>
                    <p className="mt-1 text-sm text-uni-muted leading-relaxed">
                      {tpl.body}
                    </p>
                    <div className="mt-2.5 flex items-center gap-3">
                      <button
                        onClick={() => navigate("/pray")}
                        className="text-xs font-bold text-uni-on-accent rounded-lg bg-brand px-3 py-1.5 shadow-bubble hover:shadow-glow transition-all"
                      >
                        Pray with someone
                      </button>
                      {uid && (
                        <button
                          onClick={() => savePrayer(tpl.body)}
                          className="text-xs font-semibold text-uni-gold hover:underline"
                        >
                          Save to journal
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/pray")}
              className="px-5 py-2.5 text-sm font-bold text-uni-on-accent rounded-xl bg-brand shadow-bubble hover:shadow-glow transition-all"
            >
              Pray with someone
            </button>
            <button
              onClick={() => navigate("/verses")}
              className="px-5 py-2.5 text-sm font-semibold text-uni-text rounded-xl bg-uni-surface border border-uni-border hover:border-uni-gold/50 transition-colors"
            >
              Browse verses
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

const ModeCard = ({ label, description, accent, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    style={
      active
        ? { borderColor: `${accent}99`, backgroundColor: `${accent}14` }
        : undefined
    }
    className={`text-left rounded-2xl border p-4 transition-all ${
      active
        ? "shadow-card"
        : "border-uni-border bg-uni-surface hover:border-uni-gold/40"
    }`}
  >
    <span className="flex items-center gap-1.5">
      {active && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        />
      )}
      <span className="text-sm font-semibold text-uni-text">{label}</span>
    </span>
    <span className="block text-xs text-uni-muted mt-0.5 leading-snug">
      {description}
    </span>
  </button>
);
