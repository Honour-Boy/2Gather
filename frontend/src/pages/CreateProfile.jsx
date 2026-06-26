import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "@/lib/firebase"; // Ensure firebase.js is correctly configured
import { doc, setDoc, getDocs, collection } from "firebase/firestore";
import { where, query } from "firebase/firestore";
import notify from "@/lib/toast";
import Toaster from "@/components/ui/Toaster";
import useUserStore from "@/store/userStore";

const Profile = () => {
  const [section, setSection] = useState(0);
  const [username, setUsername] = useState("");
  const [dob, setDob] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const fetchUserInfo = useUserStore((s) => s.fetchUserInfo);

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
      notify.error("User not authenticated");
      return;
    }

    // Ensure username starts with "@"
    if (!username.startsWith("@")) {
      notify.error("Username must start with \"@\"");
      return;
    }
    setLoading(true);
    // Check if the username is unique
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      notify.warn("Select another username");
      setLoading(false);
      return;
    }

    try {
      const userProfile = {
        username,
        dob,
        bio,
        gender,
      };

      await setDoc(doc(db, "users", user.uid), userProfile, { merge: true });

      // Refresh the store so the now-complete profile (username set) is in
      // currentUser before we route to /chat — otherwise the /chat guard would
      // see the stale profile-less doc and bounce straight back here.
      await fetchUserInfo(user.uid);

      notify.success("Profile created successfully!");
      // The user just authenticated to create the profile, so go straight to
      // chat; fall back to login only if the session somehow dropped.
      navigate(auth.currentUser ? "/chat" : "/login");
    } catch (error) {
      console.error("Profile creation error:", error.message);
      notify.error("Profile creation failed. Please try again.");
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
                {"Username"} *
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@ex123"
                className="w-full py-2.5 px-3 bg-uni-surface border border-uni-border text-uni-text rounded-xl outline-none focus:border-uni-lime/60 focus:shadow-[0_0_0_3px_rgba(221,162,58,0.15)] transition-all"
                required
              />
            </div>
            <div className="mb-4 date-picker-container">
              <label
                className="block text-sm font-bold mb-2 text-left"
                htmlFor="dob"
              >
                {"Date of Birth"} *
              </label>
              <input
                type="date"
                id="dob"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full py-2.5 px-3 bg-uni-surface border border-uni-border text-uni-text rounded-xl outline-none focus:border-uni-lime/60 focus:shadow-[0_0_0_3px_rgba(221,162,58,0.15)] transition-all accent-uni-lime calendar-icon-white"
                required
              />
            </div>
            <div className="mb-4">
              <label
                className="block text-sm font-bold mb-2 text-left"
                htmlFor="bio"
              >
                {"Bio"} *
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full py-2.5 px-3 bg-uni-surface border border-uni-border text-uni-text rounded-xl outline-none focus:border-uni-lime/60 focus:shadow-[0_0_0_3px_rgba(221,162,58,0.15)] transition-all max-h-24 resize-none"
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
                {"Gender"} *
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full py-2.5 px-3 bg-uni-surface border border-uni-border text-uni-text rounded-xl outline-none focus:border-uni-lime/60 focus:shadow-[0_0_0_3px_rgba(221,162,58,0.15)] transition-all"
                required
              >
                <option value="">{"Select Gender"}</option>
                <option value="male">{"Male"}</option>
                <option value="female">{"Female"}</option>
                <option value="other">{"Other"}</option>
              </select>
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
      <h1 className="text-4xl sm:text-5xl font-bold">{"Set up your Profile"}</h1>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg p-7 sm:p-8 rounded-2xl shadow-2xl bg-uni-surface border border-uni-border"
      >
        <div key={section} className="animate-fade-in-up">
          {renderSection()}
        </div>
        <div className="flex justify-between mt-6">
          {section > 0 ? (
            <button
              type="button"
              onClick={handlePrevious}
              className="py-2.5 px-5 rounded-xl text-sm font-semibold bg-uni-surface2 border border-uni-border text-uni-text hover:border-uni-lime/40 transition-colors"
            >
              {"<"} {"Previous"}
            </button>
          ) : (
            <span></span>
          )}
          {section < 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="py-2.5 px-5 rounded-xl text-sm font-bold bg-brand text-uni-on-accent shadow-bubble hover:shadow-glow transition-all"
            >
              {"Next"} {">"}
            </button>
          ) : (
            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl text-sm font-bold bg-brand text-uni-on-accent shadow-bubble hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              disabled={loading}
            >
              {loading ? "Creating Profile..." : "Submit"}
            </button>
          )}
        </div>
      </form>
      <style>
        {`
          .calendar-icon-white::-webkit-calendar-picker-indicator {
            filter: none;
          }
        `}
      </style>
    </div>
  );
};

export default Profile;
