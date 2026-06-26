import { useEffect, useState } from "react";
import { format } from "timeago.js";
import useUserStore from "@/store/userStore";
import {
  subscribeJournal,
  addJournalEntry,
  deleteJournalEntry,
  updateJournalNote,
} from "@/services/journal";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "verse", label: "Verses" },
  { id: "prayer", label: "Prayers" },
  { id: "reflection", label: "Reflections" },
];

// Private journal: the verses and prayers you've saved (each with your own
// reflection note), plus free-form reflections. Entries live under
// users/{uid}/journal (owner-only).
export default function Journal() {
  const { currentUser } = useUserStore();
  const uid = currentUser?.id;

  const [entries, setEntries] = useState([]);
  const [body, setBody] = useState("");
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeJournal(uid, setEntries);
    return () => unsub();
  }, [uid]);

  const save = async () => {
    const text = body.trim();
    if (!text || !uid || saving) return;
    setSaving(true);
    try {
      await addJournalEntry(uid, { kind: "reflection", text });
      setBody("");
    } finally {
      setSaving(false);
    }
  };

  const shown =
    filter === "all"
      ? entries
      : entries.filter((e) => (e.kind || "reflection") === filter);

  return (
    <main className="px-4 md:px-8 py-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-display font-bold text-uni-text">Journal</h1>
          <p className="text-sm text-uni-muted mt-1">
            Keep the verses and prayers that steady you — and your own reflections.
          </p>

          {/* Reflection composer */}
          <div className="mt-6 rounded-2xl border border-uni-border bg-uni-surface p-4 shadow-card">
            <label htmlFor="journal-body" className="sr-only">
              New reflection
            </label>
            <textarea
              id="journal-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="Write a reflection, a gratitude, or a prayer of your own…"
              className="w-full bg-transparent outline-none resize-none text-sm text-uni-text placeholder:text-uni-muted"
            />
            <div className="mt-2 flex items-center justify-end">
              <button
                onClick={save}
                disabled={!body.trim() || saving}
                className="px-4 py-2 text-sm font-bold text-uni-on-accent rounded-lg bg-brand shadow-bubble hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {saving ? "Saving…" : "Add reflection"}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <FilterPill
                key={f.id}
                active={filter === f.id}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </FilterPill>
            ))}
          </div>

          {/* Entries */}
          <div className="mt-4 space-y-3 pb-10">
            {shown.length === 0 && (
              <p className="text-sm text-uni-muted py-10 text-center">
                {filter === "all"
                  ? "Nothing here yet. Save a verse from the day or a prayer from a chat, and it'll keep here."
                  : "Nothing in this filter yet."}
              </p>
            )}
            {shown.map((e) => (
              <JournalEntry
                key={e.id}
                uid={uid}
                entry={e}
                onDelete={() => deleteJournalEntry(uid, e.id)}
              />
            ))}
          </div>
        </div>
      </main>
  );
}

const KIND_META = {
  verse: { label: "Verse", color: "text-uni-gold" },
  prayer: { label: "Prayer", color: "text-uni-gold" },
  reflection: { label: "Reflection", color: "text-uni-blue" },
};

const JournalEntry = ({ uid, entry, onDelete }) => {
  const kind = entry.kind || "reflection";
  const meta = KIND_META[kind] || KIND_META.reflection;
  const text = entry.text || entry.body || "";

  return (
    <div
      className={`rounded-2xl border p-4 ${
        kind === "verse"
          ? "border-uni-gold/25 bg-brand-soft"
          : "border-uni-border bg-uni-surface"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${meta.color}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {meta.label}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-uni-muted">
            {entry.createdAt?.toDate ? format(entry.createdAt.toDate()) : ""}
          </span>
          <button
            onClick={onDelete}
            className="text-[10px] text-uni-muted hover:text-red-500 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {kind === "verse" ? (
        <figure className="mt-2">
          <blockquote className="text-sm leading-relaxed text-uni-text">
            “{text}”
          </blockquote>
          {entry.reference && (
            <figcaption className="mt-1.5 text-xs font-medium text-uni-muted">
              — {entry.reference} <span className="opacity-60">(WEB)</span>
            </figcaption>
          )}
        </figure>
      ) : (
        <p className="mt-2 text-sm text-uni-text whitespace-pre-wrap leading-relaxed">
          {text}
        </p>
      )}

      {/* Reflection note — for saved verses/prayers. */}
      {kind !== "reflection" && <NoteEditor uid={uid} entry={entry} />}
    </div>
  );
};

const NoteEditor = ({ uid, entry }) => {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(entry.note || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateJournalNote(uid, entry.id, note.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return entry.note ? (
      <button
        onClick={() => setEditing(true)}
        className="mt-3 w-full text-left rounded-xl bg-uni-bg/60 border border-uni-border px-3 py-2 text-sm text-uni-text hover:border-uni-gold/40 transition-colors"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-uni-muted block mb-0.5">
          Your note
        </span>
        {entry.note}
      </button>
    ) : (
      <button
        onClick={() => setEditing(true)}
        className="mt-3 text-xs font-medium text-uni-gold hover:underline"
      >
        + Add a reflection note
      </button>
    );
  }

  return (
    <div className="mt-3">
      <textarea
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="What did this stir in you?"
        className="w-full rounded-xl bg-uni-bg/60 border border-uni-border px-3 py-2 text-sm text-uni-text placeholder:text-uni-muted outline-none focus:border-uni-gold/50 resize-none"
      />
      <div className="mt-1.5 flex items-center justify-end gap-2">
        <button
          onClick={() => {
            setNote(entry.note || "");
            setEditing(false);
          }}
          className="px-3 py-1.5 text-xs font-semibold text-uni-muted hover:text-uni-text"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="px-3 py-1.5 text-xs font-bold text-uni-on-accent rounded-lg bg-brand shadow-bubble disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save note"}
        </button>
      </div>
    </div>
  );
};

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
