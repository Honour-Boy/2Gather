// Client for the AI verse-recommendation endpoint (see backend/verseRecommend.js).
import { API_URL } from "@/lib/env";

// Ask for 1–3 real, attributed verses that fit a free-text prayer request. The
// server grounds every verse in the curated WEB corpus (the AI only ranks, never
// writes scripture) and degrades to keyword→theme matching when AI is disabled.
// `theme` (optional) is a hint, e.g. the active Mode's theme.
// Returns { translation, verses:[{id,reference,text,themes}], matchedThemes, source, support? }.
export async function recommendVerses({ request, theme } = {}) {
  const res = await fetch(`${API_URL}/api/verses/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request, ...(theme ? { theme } : {}) }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `recommend request failed: ${res.status}`);
  }
  return res.json();
}
