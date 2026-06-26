import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "timeago.js";
import Navbar from "@/components/common/Navbar";
import useUserStore from "@/store/userStore";
import useModeStore from "@/store/modeStore";
import { MODES, getMode } from "@/lib/modes";
import { addJournalEntry, subscribeJournal, deleteJournalEntry } from "@/services/journal";

// Private, Mode-tagged journal (Phase 4). Write reflections/prayers/gratitude
// tagged with a Mode, and browse/filter past entries. Entries live under
// users/{uid}/journal (owner-only).
export default function Journal() {
  const navigate = useNavigate();
  const { currentUser } = useUserStore();
  const { activeMode } = useModeStore();
  const uid = currentUser?.id;

  const [entries, setEntries] = useState([]);
  const [body, setBody] = useState("");
  const [entryMode, setEntryMode] = useState(activeMode || null);
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeJournal(uid, setEntries);
    return () => unsub();
  }, [uid]);

  // New entries default to the active Mode; follow it when it changes.
  useEffect(() => setEntryMode(activeMode || null), [activeMode]);

  const save = async () => {
    const text = body.trim();
    if (!text || !uid || saving) return;
    setSaving(true);
    try {
      await addJournalEntry(uid, { mode: entryMode, body: text });
      setBody("");
    } finally {
      setSaving(false);
    }
  };

  const shown =
    filter === "all"
      ? entries
      : entries.filter((e) => (e.mode || "general") === filter);

  return (
    <div className="bg-uni-bg text-uni-text h-screen flex w-screen overflow-hidden">
      <Navbar />
      <main className="flex-1 min-w-0 overflow-y-auto uni-scroll px-4 md:px-8 py-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate("/chat")}
            className="md:hidden mb-4 text-sm text-uni-muted hover:text-uni-text"
          >
            ← Back to chats
          </button>

          <h1 className="text-2xl font-display font-bold text-uni-text">Journal</h1>
          <p className="text-sm text-uni-muted mt-1">
            Reflections, prayers, and gratitude — tagged by your mode.
          </p>

          {/* Composer */}
          <div className="mt-6 rounded-2xl border border-uni-border bg-uni-surface/60 p-4">
            <label htmlFor="journal-body" className="sr-only">
              New journal entry
            </label>
            <textarea
              id="journal-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Write a reflection…"
              className="w-full bg-transparent outline-none resize-none text-sm text-uni-text placeholder:text-uni-muted"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <select
                value={entryMode || "general"}
                onChange={(e) =>
                  setEntryMode(e.target.value === "general" ? null : e.target.value)
                }
                aria-label="Mode for this entry"
                className="bg-uni-surface border border-uni-border rounded-lg text-xs text-uni-muted px-2 py-1.5 outline-none"
              >
                <option value="general">General</option>
                {MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <button
                onClick={save}
                disabled={!body.trim() || saving}
                className="px-4 py-2 text-sm font-bold text-uni-on-accent rounded-lg bg-brand shadow-bubble hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          {/* Filter */}
          <div className="mt-6 flex flex-wrap gap-2">
            <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
              All
            </FilterPill>
            <FilterPill active={filter === "general"} onClick={() => setFilter("general")}>
              General
            </FilterPill>
            {MODES.map((m) => (
              <FilterPill key={m.id} active={filter === m.id} onClick={() => setFilter(m.id)}>
                {m.label}
              </FilterPill>
            ))}
          </div>

          {/* Entries */}
          <div className="mt-4 space-y-3 pb-10">
            {shown.length === 0 && (
              <p className="text-sm text-uni-muted py-8 text-center">No entries yet.</p>
            )}
            {shown.map((e) => (
              <div key={e.id} className="rounded-2xl border border-uni-border bg-uni-surface/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-uni-lime">
                    {getMode(e.mode)?.label || "General"}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-uni-muted">
                      {e.createdAt?.toDate ? format(e.createdAt.toDate()) : ""}
                    </span>
                    <button
                      onClick={() => deleteJournalEntry(uid, e.id)}
                      className="text-[10px] text-uni-muted hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-uni-text whitespace-pre-wrap">{e.body}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

const FilterPill = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
      active
        ? "bg-brand text-uni-on-accent"
        : "bg-uni-surface border border-uni-border text-uni-muted hover:text-uni-text"
    }`}
  >
    {children}
  </button>
);
