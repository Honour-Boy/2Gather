// Client for the backend Bible verse engine (see backend/verses.js).
import { API_URL } from "@/lib/env";

// Fetch the deterministic verse of the day, optionally scoped to a theme
// (journey-and-trust | courage | rest | gratitude | peace). Returns the verse
// object { id, reference, text, themes } or null.
export async function fetchDailyVerse({ theme } = {}) {
  const url = new URL(`${API_URL}/api/verses/daily`);
  if (theme) url.searchParams.set("theme", theme);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`verse-of-the-day request failed: ${res.status}`);

  const data = await res.json();
  return data.verse || null;
}

// Fetch verses, optionally scoped to a theme. With no theme this is a general
// AI-curated set; with a theme it's that theme's set (whole Bible, refreshed
// daily). Returns an array of { id, reference, text, themes }.
export async function fetchVerses({ theme } = {}) {
  const url = new URL(`${API_URL}/api/verses`);
  if (theme) url.searchParams.set("theme", theme);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`verses request failed: ${res.status}`);

  const data = await res.json();
  return data.verses || [];
}

// Search the whole Bible (via API.Bible) by keyword/phrase. Returns an array of
// { id, reference, text, themes }.
export async function searchVerses(query) {
  const url = new URL(`${API_URL}/api/verses/search`);
  url.searchParams.set("q", query);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`verse search failed: ${res.status}`);

  const data = await res.json();
  return data.verses || [];
}
