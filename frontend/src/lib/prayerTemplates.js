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
