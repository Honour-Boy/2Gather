import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { db, auth } from "@/lib/firebase"; // Ensure firebase.js is correctly configured
import { doc, setDoc, getDocs, collection } from "firebase/firestore";
import { where, query } from "firebase/firestore";
import notify from "@/lib/toast";
import Toaster from "@/components/ui/Toaster";
import useUserStore from "@/store/userStore";
import { UI_LANGUAGES, setUiLanguage } from "@/lib/i18n";
import { supportedLanguages } from "@/components/common/Languages";

const Profile = () => {
  const { t } = useTranslation();
  const [section, setSection] = useState(0);
  const [username, setUsername] = useState("");
  const [language, setLanguage] = useState("");
  const [dob, setDob] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [organization, setOrganization] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const fetchUserInfo = useUserStore((s) => s.fetchUserInfo);

  // Just record the chosen preferred language for the profile. We intentionally
  // do NOT switch the live UI language here — only the landing-page switcher and
  // Settings change the UI language (owner request, 2026-06-04).
  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  const handleNext = () => {
    setSection((prev) => prev + 1);
  };

  const handlePrevious = () => {
    setSection((prev) => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      notify.error(t("profile.notAuthenticated"));
      return;
    }

    // Ensure username starts with "@"
    if (!username.startsWith("@")) {
      notify.error(t("profile.usernameAt"));
      return;
    }
    setLoading(true);
    // Check if the username is unique
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      notify.warn(t("profile.selectAnotherUsername"));
      setLoading(false);
      return;
    }

    try {
      const userProfile = {
        username,
        language,
        dob,
        bio,
        gender,
        organization,
        jobTitle,
      };

      await setDoc(doc(db, "users", user.uid), userProfile, { merge: true });

      // Refresh the store so the now-complete profile (username set) is in
      // currentUser before we route to /chat — otherwise the /chat guard would
      // see the stale profile-less doc and bounce straight back here.
      await fetchUserInfo(user.uid);

      // Apply the chosen language now, on submit — the profile language becomes
      // the UI language shown throughout the app (changed only from the profile
      // afterward). We deliberately don't switch live while the dropdown is open.
      if (UI_LANGUAGES.includes(language)) setUiLanguage(language);

      notify.success(t("profile.profileCreated"));
      // The user just authenticated to create the profile, so go straight to
      // chat; fall back to login only if the session somehow dropped.
      navigate(auth.currentUser ? "/chat" : "/login");
    } catch (error) {
      console.error("Profile creation error:", error.message);
      notify.error(t("profile.profileFailed"));
    }
  };

  const renderSection = () => {
    switch (section) {
      case 0:
        return (
          <div>
            <div className="mb-4">
              <label
                className="block text-sm font-bold mb-2 text-left"
                htmlFor="username"
              >
                {t("profile.username")} *
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@ex123"
                className="w-full py-2.5 px-3 bg-uni-bg/60 border border-uni-border text-white rounded-xl outline-none focus:border-uni-lime/60 focus:shadow-[0_0_0_3px_rgba(198,255,61,0.15)] transition-all"
                required
              />
            </div>
            <div className="mb-4 date-picker-container">
              <label
                className="block text-sm font-bold mb-2 text-left"
                htmlFor="dob"
              >
                {t("profile.dob")} *
              </label>
              <input
                type="date"
                id="dob"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full py-2.5 px-3 bg-uni-bg/60 border border-uni-border text-white rounded-xl outline-none focus:border-uni-lime/60 focus:shadow-[0_0_0_3px_rgba(198,255,61,0.15)] transition-all accent-uni-lime calendar-icon-white"
                required
              />
            </div>
            <div className="mb-4">
              <label
                className="block text-sm font-bold mb-2 text-left"
                htmlFor="bio"
              >
                {t("profile.bio")} *
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full py-2.5 px-3 bg-uni-bg/60 border border-uni-border text-white rounded-xl outline-none focus:border-uni-lime/60 focus:shadow-[0_0_0_3px_rgba(198,255,61,0.15)] transition-all max-h-24 resize-none"
                required
              />
            </div>
          </div>
        );
      case 1:
        return (
          <div>
            <div className="mb-4">
              <label
                className="block text-sm font-bold mb-2 text-left"
                htmlFor="gender"
              >
                {t("profile.gender")} *
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full py-2.5 px-3 bg-uni-bg/60 border border-uni-border text-white rounded-xl outline-none focus:border-uni-lime/60 focus:shadow-[0_0_0_3px_rgba(198,255,61,0.15)] transition-all"
                required
              >
                <option value="">{t("profile.selectGender")}</option>
                <option value="male">{t("profile.male")}</option>
                <option value="female">{t("profile.female")}</option>
                <option value="other">{t("profile.other")}</option>
              </select>
            </div>
            <div className="mb-4">
              <label
                className="block text-sm font-bold mb-2 text-left"
                htmlFor="language"
              >
                {t("profile.language")} *
              </label>
              <select
                id="language"
                value={language}
                onChange={handleLanguageChange}
                className="w-full py-2.5 px-3 bg-uni-bg/60 border border-uni-border text-white rounded-xl outline-none focus:border-uni-lime/60 focus:shadow-[0_0_0_3px_rgba(198,255,61,0.15)] transition-all"
                required
              >
                <option value="">{t("profile.selectLanguage")}</option>
                {supportedLanguages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <div className="mb-4">
              <label
                className="block text-sm font-bold mb-2 text-left"
                htmlFor="organization"
              >
                {t("profile.organization")} *
              </label>
              <input
                type="text"
                id="organization"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full py-2.5 px-3 bg-uni-bg/60 border border-uni-border text-white rounded-xl outline-none focus:border-uni-lime/60 focus:shadow-[0_0_0_3px_rgba(198,255,61,0.15)] transition-all"
                required
              />
            </div>
            <div className="mb-6">
              <label
                className="block text-sm font-bold mb-2 text-left"
                htmlFor="jobTitle"
              >
                {t("profile.jobTitle")} *
              </label>
              <input
                type="text"
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full py-2.5 px-3 bg-uni-bg/60 border border-uni-border text-white rounded-xl outline-none focus:border-uni-lime/60 focus:shadow-[0_0_0_3px_rgba(198,255,61,0.15)] transition-all"
                required
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-8 items-center h-screen overflow-y-auto uni-scroll bg-uni-bg text-uni-text px-4 py-12">
      <Toaster />
      <h1 className="text-4xl sm:text-5xl font-bold">{t("profile.title")}</h1>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg p-7 sm:p-8 rounded-2xl shadow-2xl bg-uni-surface border border-uni-border"
      >
        <div
          className={`${
            section === 0 ? "translate-x-0" : "-translate-x-screen"
          }`}
        >
          {renderSection()}
        </div>
        <div className="flex justify-between mt-6">
          {section > 0 ? (
            <button
              type="button"
              onClick={handlePrevious}
              className="py-2.5 px-5 rounded-xl text-sm font-semibold bg-uni-surface2 border border-uni-border text-white hover:border-uni-lime/40 transition-colors"
            >
              {"<"} {t("profile.previous")}
            </button>
          ) : (
            <span></span>
          )}
          {section < 2 ? (
            <button
              type="button"
              onClick={handleNext}
              className="py-2.5 px-5 rounded-xl text-sm font-bold bg-brand text-uni-on-accent shadow-bubble hover:shadow-glow transition-all"
            >
              {t("profile.next")} {">"}
            </button>
          ) : (
            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl text-sm font-bold bg-brand text-uni-on-accent shadow-bubble hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              disabled={loading}
            >
              {loading ? t("profile.creating") : t("profile.submit")}
            </button>
          )}
        </div>
      </form>
      <style>
        {`
          .calendar-icon-white::-webkit-calendar-picker-indicator {
            filter: invert(1);
          }
        `}
      </style>
    </div>
  );
};

export default Profile;
