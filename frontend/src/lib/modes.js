// The five life-situation "Modes" (Phase 4). Each maps to a verse/prayer-template
// theme (the taxonomy from Phases 2–3), so switching Mode re-scopes the verse of
// the day, the verse picker, and the prayer-template picker. `accent` is a curated
// hex that lightly tints the active Mode's space (kept muted + harmonious so the
// warm brand still reads through); `headline` is a short, reverent line that meets
// the moment. activeMode === null means "general" (no filter, brand gold accent).
export const MODES = [
  { id: "travel",    label: "Travel",                  description: "Journey prayers for the road",   theme: "journey-and-trust", accent: "#6E96C4", headline: "Traveling mercies for the road ahead — you don't journey alone." },
  { id: "interview", label: "Interview Prep",          description: "Confidence before you walk in",  theme: "courage",           accent: "#DDA23A", headline: "Walk in steady. He's given you a spirit of power, not of fear." },
  { id: "pitch",     label: "Business Pitch",          description: "Boldness as you present",         theme: "courage",           accent: "#C77B5E", headline: "Speak with boldness and a clear mind — your words are carried." },
  { id: "promotion", label: "Promotion & Opportunity", description: "Gratitude for open doors",        theme: "gratitude",         accent: "#5BA86F", headline: "Gratitude for the door that opened — give thanks in this new season." },
  { id: "downtime",  label: "Downtime & Recovery",     description: "Rest and restoration",            theme: "rest",              accent: "#7E84BC", headline: "Permission to rest. Come to Him and be restored." },
];

// The brand gold — the default accent for the "general" (no-Mode) space.
export const BRAND_ACCENT = "#DDA23A";

export const getMode = (id) => MODES.find((m) => m.id === id) || null;

// The verse/template theme for a Mode id, or undefined for "general" (all).
export const themeForMode = (id) => getMode(id)?.theme || undefined;

// The curated accent hex for a Mode id, falling back to the brand gold for
// "general"/unknown so callers can always tint without a null check.
export const accentForMode = (id) => getMode(id)?.accent || BRAND_ACCENT;

// The reverent headline for a Mode id, or "" for "general"/unknown.
export const headlineForMode = (id) => getMode(id)?.headline || "";

// The verse/template themes (the taxonomy the Modes map to). Used by the
// notification-nudge theme picker in Settings.
export const VERSE_THEMES = [
  { id: "journey-and-trust", label: "Journey & Trust" },
  { id: "courage", label: "Courage" },
  { id: "rest", label: "Rest" },
  { id: "gratitude", label: "Gratitude" },
  { id: "peace", label: "Peace" },
];
