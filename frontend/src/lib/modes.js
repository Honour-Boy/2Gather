// The five life-situation "Modes" (Phase 4). Each maps to a verse/prayer-template
// theme (the taxonomy from Phases 2–3), so switching Mode re-scopes the verse of
// the day, the verse picker, and the prayer-template picker. `accent` is a brand
// token for light per-Mode theming. activeMode === null means "general" (no filter).
export const MODES = [
  { id: "travel",    label: "Travel",                  description: "Journey prayers for the road",   theme: "journey-and-trust", accent: "cyan" },
  { id: "interview", label: "Interview Prep",          description: "Confidence before you walk in",  theme: "courage",           accent: "lime" },
  { id: "pitch",     label: "Business Pitch",          description: "Boldness as you present",         theme: "courage",           accent: "lime" },
  { id: "promotion", label: "Promotion & Opportunity", description: "Gratitude for open doors",        theme: "gratitude",         accent: "magenta" },
  { id: "downtime",  label: "Downtime & Recovery",     description: "Rest and restoration",            theme: "rest",              accent: "cyan" },
];

export const getMode = (id) => MODES.find((m) => m.id === id) || null;

// The verse/template theme for a Mode id, or undefined for "general" (all).
export const themeForMode = (id) => getMode(id)?.theme || undefined;

// The verse/template themes (the taxonomy the Modes map to). Used by the
// notification-nudge theme picker in Settings.
export const VERSE_THEMES = [
  { id: "journey-and-trust", label: "Journey & Trust" },
  { id: "courage", label: "Courage" },
  { id: "rest", label: "Rest" },
  { id: "gratitude", label: "Gratitude" },
  { id: "peace", label: "Peace" },
];
