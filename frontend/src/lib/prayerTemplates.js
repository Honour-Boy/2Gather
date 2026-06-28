// Client for the backend prayer-template library (see backend/prayerTemplates.js).
import { API_URL } from "@/lib/env";

// Fetch curated prayer templates, optionally scoped to a theme. Returns an array
// of { id, theme, title, body }.
export async function fetchPrayerTemplates({ theme } = {}) {
  const url = new URL(`${API_URL}/api/prayer-templates`);
  if (theme) url.searchParams.set("theme", theme);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`prayer-templates request failed: ${res.status}`);

  const data = await res.json();
  return data.templates || [];
}

// Ask the backend to generate a short, reverent STARTER prayer for a topic/theme
// (opt-in — only called when the user has enabled AI). Returns
// { prayer, verse: {reference,text}|null, source, support? }. The prayer is
// editable; any verse is real + attributed (never model-quoted).
export async function generatePrayer({ topic, theme, hasVerse } = {}) {
  const res = await fetch(`${API_URL}/api/prayer-templates/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, theme, hasVerse: !!hasVerse }),
  });
  if (!res.ok) throw new Error(`generate request failed: ${res.status}`);
  return res.json();
}
