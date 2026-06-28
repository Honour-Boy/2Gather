import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import notify from "@/lib/toast";
import Toaster from "@/components/ui/Toaster";
import { db } from "@/lib/firebase";
import useUserStore from "@/store/userStore";
import LoadingSpinner from "@/components/common/LoadingComponent";
import Avatar from "@/components/ui/Avatar";
import { enableNotifications } from "@/lib/messaging";
import { VERSE_THEMES } from "@/lib/modes";
import {
  subscribeCustomTemplates,
  addCustomTemplate,
  deleteCustomTemplate,
} from "@/services/customTemplates";

// In-app profile editing. Pre-fills from the signed-in user's `users/{uid}` doc
// and writes edits back. Username keeps its "@"-prefix + uniqueness rule (only
// re-checked when it actually changes). Avatar images are stored as a small
// base64 JPEG data URL on the user doc (`avatarUrl`) — no Firebase Storage /
// paid bucket needed. The picker below center-crops + downscales to a 128px
// thumbnail (~10-30 KB) so it stays well within Firestore's 1 MiB doc limit and
// doesn't bloat the frequently-read doc.
const FIELDS = [
  "fullName",
  "username",
  "bio",
  "dob",
  "gender",
  "avatarUrl",
];

// Max stored thumbnail dimension (square) and JPEG quality.
const AVATAR_DIM = 128;

// Notification preference defaults + hour options for the quiet-hours selects.
const DEFAULT_PREFS = {
  newMessages: true,
  nudges: false,
  nudgeTheme: "",
  quietHours: { start: 22, end: 7 },
};
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const fmtHour = (h) => `${String(h).padStart(2, "0")}:00`;

// Read an image file, center-crop to a square, downscale to AVATAR_DIM, and
// return a base64 JPEG data URL. Rejects with a plain English message for
// non-images / unreadable files.
const fileToAvatarDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file.type?.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That image couldn't be loaded."));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_DIM;
        canvas.height = AVATAR_DIM;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_DIM, AVATAR_DIM);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

const inputCls =
  "w-full bg-uni-surface border border-uni-border rounded-xl px-3 py-2.5 text-sm text-uni-text outline-none focus:border-uni-lime/60 focus:shadow-[0_0_0_3px_rgba(221,162,58,0.15)] transition-all";

const Settings = () => {
  const navigate = useNavigate();
  const { currentUser, fetchUserInfo } = useUserStore();

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [notifBusy, setNotifBusy] = useState(false);

  // Seed the form from the store once it's available (only once).
  useEffect(() => {
    if (!currentUser) return;
    setForm((prev) =>
      prev
        ? prev
        : {
            ...FIELDS.reduce((acc, f) => ({ ...acc, [f]: currentUser[f] || "" }), {}),
            aiPrayerTemplates: !!currentUser.aiPrayerTemplates,
            notificationPrefs: {
              ...DEFAULT_PREFS,
              ...(currentUser.notificationPrefs || {}),
              quietHours: {
                ...DEFAULT_PREFS.quietHours,
                ...((currentUser.notificationPrefs || {}).quietHours || {}),
              },
            },
          }
    );
  }, [currentUser]);

  if (!currentUser || !form) {
    return (
      <div className="flex items-center justify-center h-full bg-uni-bg text-uni-text">
        <LoadingSpinner />
      </div>
    );
  }

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the user re-pick the same file later
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setForm((f) => ({ ...f, avatarUrl: dataUrl }));
      setErrors((er) => ({ ...er, avatar: undefined }));
    } catch (err) {
      setErrors((er) => ({
        ...er,
        avatar: err.message || "Couldn't use that image.",
      }));
    }
  };

  const removeAvatar = () => setForm((f) => ({ ...f, avatarUrl: "" }));

  // Enable FCM push on this device (Phase 5). Best-effort; surfaces a clear
  // message for each failure (unsupported / denied / not yet configured).
  const enablePush = async () => {
    if (notifBusy) return;
    setNotifBusy(true);
    try {
      await enableNotifications(currentUser.id);
      await fetchUserInfo(currentUser.id);
      notify.success("Notifications enabled on this device.");
    } catch (err) {
      notify.error(err.message || "Couldn't enable notifications.");
    } finally {
      setNotifBusy(false);
    }
  };

  const setPref = (key, val) =>
    setForm((f) => ({
      ...f,
      notificationPrefs: { ...f.notificationPrefs, [key]: val },
    }));
  const setQuiet = (key, val) =>
    setForm((f) => ({
      ...f,
      notificationPrefs: {
        ...f.notificationPrefs,
        quietHours: { ...f.notificationPrefs.quietHours, [key]: val },
      },
    }));

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Name is required.";
    const username = form.username.trim();
    if (!username) e.username = "Username is required.";
    else if (!username.startsWith("@")) e.username = "Username must start with \"@\".";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    try {
      const username = form.username.trim();

      // Only re-check uniqueness if the username actually changed.
      if (username !== (currentUser.username || "")) {
        const snap = await getDocs(
          query(collection(db, "users"), where("username", "==", username))
        );
        const takenByOther = snap.docs.some((d) => d.id !== currentUser.id);
        if (takenByOther) {
          setErrors((e) => ({ ...e, username: "That username is taken." }));
          setSaving(false);
          return;
        }
      }

      const patch = FIELDS.reduce(
        (acc, f) => ({ ...acc, [f]: f === "username" ? username : form[f] }),
        {}
      );
      patch.notificationPrefs = form.notificationPrefs;
      patch.aiPrayerTemplates = !!form.aiPrayerTemplates;
      await updateDoc(doc(db, "users", currentUser.id), patch);

      // Refresh the store so the rest of the app reflects the edits immediately.
      await fetchUserInfo(currentUser.id);

      notify.success("Profile updated.");
      setTimeout(() => navigate("/home"), 800);
    } catch (err) {
      console.error("Profile update failed:", err);
      notify.error("Couldn't save your profile. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-uni-bg text-uni-text">
      <Toaster />

      <form onSubmit={handleSave} className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8">
        <header>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            {"Edit profile"}
          </h1>
          <p className="mt-1 text-sm text-uni-muted">
            Update how you show up on 2Gather.
          </p>
        </header>

        {/* Avatar + identity summary */}
        <section className="flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar
              name={form.fullName}
              avatarUrl={form.avatarUrl}
              className="!w-16 !h-16 text-xl"
            />
            <label
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-uni-surface2 border border-uni-border flex items-center justify-center cursor-pointer hover:border-uni-lime/60 transition-colors"
              title={"Change photo"}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarPick}
                aria-label={"Change photo"}
              />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </label>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-uni-text truncate">
              {form.fullName || "Your name"}
            </p>
            <p className="text-xs text-uni-muted truncate">{currentUser.email}</p>
            {form.avatarUrl && (
              <button
                type="button"
                onClick={removeAvatar}
                className="mt-1 text-xs text-uni-muted hover:text-red-400 transition-colors"
              >
                {"Remove photo"}
              </button>
            )}
            {errors.avatar && (
              <p className="mt-1 text-xs text-red-400">{errors.avatar}</p>
            )}
          </div>
        </section>

        {/* Identity */}
        <Section title={"Identity"}>
          <Field label={"Full name"} error={errors.fullName}>
            <input type="text" value={form.fullName} onChange={set("fullName")} className={inputCls} placeholder={"Your name"} />
          </Field>
          <Field label={"Username"} error={errors.username} hint={"Starts with @, unique across 2Gather."}>
            <input type="text" value={form.username} onChange={set("username")} className={inputCls} placeholder={"@username"} />
          </Field>
          <Field label={"Email"} hint={"Managed by your sign-in; can't be edited here."}>
            <input type="email" value={currentUser.email || ""} disabled className={`${inputCls} opacity-60 cursor-not-allowed`} />
          </Field>
        </Section>

        {/* About */}
        <Section title={"About"}>
          <Field label={"Bio"}>
            <textarea value={form.bio} onChange={set("bio")} rows={3} className={`${inputCls} resize-none`} placeholder={"A short bio"} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={"Date of birth"}>
              <input type="date" value={form.dob} onChange={set("dob")} className={`${inputCls} calendar-icon-white`} />
            </Field>
            <Field label={"Gender"}>
              <select value={form.gender} onChange={set("gender")} className={inputCls}>
                <option value="">{"Select"}</option>
                <option value="male">{"Male"}</option>
                <option value="female">{"Female"}</option>
                <option value="other">{"Other"}</option>
              </select>
            </Field>
          </div>
        </Section>

        {/* Prayer templates */}
        <Section title={"Prayer templates"}>
          <PrefToggle
            label={"Let AI write a starter prayer for me"}
            checked={!!form.aiPrayerTemplates}
            onChange={(v) => setForm((f) => ({ ...f, aiPrayerTemplates: v }))}
          />
          <p className="text-xs text-uni-muted">
            When on, the prayer-template picker can generate a short starter prayer
            for your chosen topic. It’s always editable before you send, and any
            verse it suggests is real and attributed — never written by the AI.
          </p>
          <CustomTemplatesManager uid={currentUser.id} />
        </Section>

        {/* Notifications */}
        <Section title={"Notifications"}>
          <p className="text-sm text-uni-muted">
            Get a push when someone sends you a prayer. Enable it on each device
            you use.
          </p>
          <button
            type="button"
            onClick={enablePush}
            disabled={notifBusy}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-uni-surface border border-uni-border text-uni-text hover:border-uni-lime/50 disabled:opacity-50 transition-colors"
          >
            {notifBusy
              ? "Enabling…"
              : "Enable push on this device"}
          </button>

          <div className="space-y-3 pt-1">
            <PrefToggle
              label={"New prayer messages"}
              checked={form.notificationPrefs.newMessages !== false}
              onChange={(v) => setPref("newMessages", v)}
            />
            <PrefToggle
              label={"Daily verse nudge"}
              checked={!!form.notificationPrefs.nudges}
              onChange={(v) => setPref("nudges", v)}
            />
            {form.notificationPrefs.nudges && (
              <div className="space-y-4 pt-1">
                <Field label={"Nudge theme"}>
                  <select
                    value={form.notificationPrefs.nudgeTheme || ""}
                    onChange={(e) => setPref("nudgeTheme", e.target.value)}
                    className={inputCls}
                  >
                    <option value="">{"Any (general)"}</option>
                    {VERSE_THEMES.map((th) => (
                      <option key={th.id} value={th.id}>
                        {th.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label={"Quiet hours start"}>
                    <select
                      value={form.notificationPrefs.quietHours.start}
                      onChange={(e) => setQuiet("start", Number(e.target.value))}
                      className={inputCls}
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h}>
                          {fmtHour(h)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={"Quiet hours end"}>
                    <select
                      value={form.notificationPrefs.quietHours.end}
                      onChange={(e) => setQuiet("end", Number(e.target.value))}
                      className={inputCls}
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h}>
                          {fmtHour(h)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <p className="text-xs text-uni-muted">
                  {"No nudges between these hours. Preferences save with your profile."}
                </p>
              </div>
            )}
          </div>
        </Section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-uni-muted hover:text-uni-text hover:bg-uni-surface transition-colors"
          >
            {"Cancel"}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-brand text-uni-on-accent shadow-bubble hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      {/* Make the native date picker indicator visible on the dark theme. */}
      <style>{`.calendar-icon-white::-webkit-calendar-picker-indicator { filter: none; }`}</style>
    </div>
  );
};

const CustomTemplatesManager = ({ uid }) => {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeCustomTemplates(uid, setItems);
    return () => unsub();
  }, [uid]);

  const add = async () => {
    const b = body.trim();
    if (!b || busy) return;
    setBusy(true);
    try {
      await addCustomTemplate(uid, { title: title.trim(), body: b });
      setTitle("");
      setBody("");
      notify.success("Template saved.");
    } catch {
      notify.error("Couldn’t save the template.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      await deleteCustomTemplate(uid, id);
    } catch {
      notify.error("Couldn’t delete the template.");
    }
  };

  return (
    <div className="space-y-3 pt-1">
      <p className="text-sm font-medium text-uni-text">Your templates</p>
      {items.length === 0 ? (
        <p className="text-xs text-uni-muted">
          Save your own go-to prayers to reuse them in any chat.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li
              key={t.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-uni-border bg-uni-bg/60 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-uni-text truncate">{t.title}</p>
                <p className="text-xs text-uni-muted line-clamp-2">{t.body}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="shrink-0 text-xs text-uni-muted hover:text-red-500 transition-colors"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-uni-border bg-uni-surface p-3 space-y-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            // Enter adds the template instead of submitting the profile form.
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Title (e.g. Before work)"
          className={inputCls}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Write your prayer…"
          className={`${inputCls} resize-none`}
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={add}
            disabled={!body.trim() || busy}
            className="px-4 py-2 text-sm font-bold text-uni-on-accent rounded-lg bg-brand shadow-bubble hover:shadow-glow disabled:opacity-50 transition-all"
          >
            {busy ? "Saving…" : "Add template"}
          </button>
        </div>
      </div>
    </div>
  );
};

const PrefToggle = ({ label, checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    aria-pressed={checked}
    className="w-full flex items-center justify-between gap-3 text-left"
  >
    <span className="text-sm text-uni-text">{label}</span>
    <span
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-brand" : "bg-uni-border"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </span>
  </button>
);

const Section = ({ title, children }) => (
  <section className="space-y-4">
    <h2 className="text-xs font-semibold text-uni-muted uppercase tracking-wider">
      {title}
    </h2>
    {children}
  </section>
);

const Field = ({ label, hint, error, children }) => (
  <div>
    <label className="block text-sm font-medium text-uni-text mb-1.5">{label}</label>
    {children}
    {error ? (
      <p className="mt-1 text-xs text-red-400">{error}</p>
    ) : hint ? (
      <p className="mt-1 text-xs text-uni-muted">{hint}</p>
    ) : null}
  </div>
);

export default Settings;
