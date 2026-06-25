// Prayer-template library (Phase 2). Curated, editable starter prayers grouped
// by the same themes as the verse engine, so a user can open a prayer chat with
// a heartfelt prompt instead of a blank box. Pure data — no Firebase, no I/O —
// so it imports cleanly in tests and is trivially cacheable.

const { THEMES, THEME_LABELS } = require("./verses");

// id is stable (React key). theme reuses the verse taxonomy. title is a short
// label; body is the editable prayer the composer prefills.
const PRAYER_TEMPLATES = [
  // Journey & Trust (Travel)
  { id: "tpl-travel-mercies", theme: "journey-and-trust", title: "Traveling mercies",
    body: "Father, watch over this journey. Guide my steps, keep me safe, and help me trust You with every mile. Amen." },
  { id: "tpl-unknown-road", theme: "journey-and-trust", title: "Stepping into the unknown",
    body: "Lord, I don't know the road ahead, but I know You go before me. Give me courage to take the next step and trust Your leading. Amen." },

  // Courage (Interview / Pitch)
  { id: "tpl-interview", theme: "courage", title: "Before an interview",
    body: "Lord, steady my heart and quiet my nerves. Give me clarity and the right words, and let me rest in You whatever the outcome. Amen." },
  { id: "tpl-pitch", theme: "courage", title: "Before a pitch",
    body: "God, give me boldness and a clear mind as I present. Let my work speak with excellence, and let me lean on Your strength, not my own. Amen." },
  { id: "tpl-hard-conversation", theme: "courage", title: "A hard conversation",
    body: "Father, give me grace and courage for this conversation. Let my words bring truth and peace, and guard my heart. Amen." },

  // Rest (Downtime & Recovery)
  { id: "tpl-weary", theme: "rest", title: "Weary and worn",
    body: "Jesus, I'm tired. Thank You that You give rest to the weary. Quiet my mind, lift my burden, and restore my soul tonight. Amen." },
  { id: "tpl-burnout", theme: "rest", title: "Running on empty",
    body: "Lord, I've been pouring out with nothing left. Refill me, slow me down, and remind me that I am held even when I rest. Amen." },
  { id: "tpl-sleep", theme: "rest", title: "Unable to sleep",
    body: "Father, as I lie down, I give You every worry. Let me sleep in peace, for You alone keep me safe. Amen." },

  // Gratitude (Promotion & Opportunity)
  { id: "tpl-opportunity", theme: "gratitude", title: "Thankful for an opportunity",
    body: "Thank You, Lord, for this open door. Help me steward it well and give You the glory in all of it. Amen." },
  { id: "tpl-promotion", theme: "gratitude", title: "A new role or promotion",
    body: "Father, thank You for this gift. Keep me humble, make me faithful, and let me serve others well in this place. Amen." },
  { id: "tpl-good-news", theme: "gratitude", title: "Celebrating good news",
    body: "Lord, my heart is full. Thank You for Your goodness — receive my joy and praise today. Amen." },

  // Peace
  { id: "tpl-anxious", theme: "peace", title: "Anxious heart",
    body: "Father, I bring You everything weighing on me. Trade my anxiety for Your peace that passes understanding, and guard my heart. Amen." },
  { id: "tpl-overwhelmed", theme: "peace", title: "Overwhelmed",
    body: "Lord, it's all too much right now. Be still in me. Help me to release control and rest in Your nearness. Amen." },
  { id: "tpl-waiting", theme: "peace", title: "In a season of waiting",
    body: "Father, waiting is hard. Strengthen my patience, settle my heart, and help me trust Your timing. Amen." },
];

function getTemplatesByTheme(theme) {
  return PRAYER_TEMPLATES.filter((tpl) => tpl.theme === theme);
}

// GET /api/prayer-templates?theme=courage
function templatesHandler(req, res) {
  const { theme } = req.query;
  if (theme && !THEMES.includes(theme)) {
    return res.status(400).json({ error: "unknown theme", themes: THEMES });
  }
  const templates = theme ? getTemplatesByTheme(theme) : PRAYER_TEMPLATES;
  res.set("Cache-Control", "public, max-age=86400");
  return res.json({ themes: THEME_LABELS, count: templates.length, templates });
}

module.exports = {
  PRAYER_TEMPLATES,
  getTemplatesByTheme,
  templatesHandler,
};
