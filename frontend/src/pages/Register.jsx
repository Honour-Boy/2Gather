import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { showPass, hidePass } from "@/assets";
import { db, auth } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import notify from "@/lib/toast";
import Toaster from "@/components/ui/Toaster";
import ReactMarkdown from "react-markdown";
import privacy from "@/components/common/PrivacyPolicy.md";
import terms from "@/components/common/Terms.md";
import AuthLayout from "@/components/ui/AuthLayout";
import Field from "@/components/ui/Field";
import Spinner from "@/components/ui/Spinner";

function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordShow, setPasswordShow] = useState({
    type: "password",
    img: hidePass,
  });
  const [showPopup, setShowPopup] = useState(false);
  const [popupContent, setPopupContent] = useState("");
  const [termsContent, setTermsContent] = useState("");
  const [privacyContent, setPrivacyContent] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    fetch(terms)
      .then((r) => r.text())
      .then(setTermsContent);
    fetch(privacy)
      .then((r) => r.text())
      .then(setPrivacyContent);
  }, []);

  const togglePassword = () =>
    setPasswordShow((p) => ({
      ...p,
      type: p.type === "password" ? "text" : "password",
      img: p.img === hidePass ? showPass : hidePass,
    }));

  const validate = () => {
    const e = {};
    if (!fullName.trim()) e.fullName = t("register.errFullName");
    if (password !== confirmPassword)
      e.confirmPassword = t("register.errPasswordsMatch");
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z]).{6,}$/;
    if (!passwordRegex.test(password))
      e.password = t("register.errPasswordRule");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        fullName,
        email,
        id: user.uid,
        blocked: [],
      });
      // No userchats doc to seed: the index lives in the userchats/{uid}/items
      // subcollection, written server-side (rules deny client userchats writes).
      // Routing takes it from here: onAuthStateChanged flips the session, and
      // the /chat guard bounces a profile-less new user to /create-profile.
      navigate("/create-profile");
    } catch (error) {
      console.error(error);
      notify.error(t("register.registrationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const openTerms = (e) => {
    e.preventDefault();
    setPopupContent("terms");
    setShowPopup(true);
  };
  const openPrivacy = (e) => {
    e.preventDefault();
    setPopupContent("privacy");
    setShowPopup(true);
  };

  return (
    <>
      {showPopup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-uni-surface border border-uni-border text-uni-text rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto uni-scroll p-6">
            <h2 className="text-xl font-bold mb-3 text-white">
              {popupContent === "terms"
                ? t("register.termsTitle")
                : t("register.privacyTitle")}
            </h2>
            <div className="text-sm text-uni-text whitespace-pre-wrap text-left leading-relaxed">
              <ReactMarkdown>
                {popupContent === "terms" ? termsContent : privacyContent}
              </ReactMarkdown>
            </div>
            <button
              onClick={() => setShowPopup(false)}
              className="mt-5 auth-primary-btn"
            >
              {t("register.close")}
            </button>
          </div>
        </div>
      )}

      <AuthLayout
        title={t("register.title")}
        subtitle={t("register.subtitle")}
        wide
      >
        <form onSubmit={handleRegister} className="space-y-4">
          <Field label={t("register.fullName")} htmlFor="fullName">
            <input
              type="text"
              id="fullName"
              value={fullName}
              placeholder="Jane Doe"
              onChange={(e) => setFullName(e.target.value)}
              className="auth-input"
              required
            />
            {errors.fullName && <ErrorText msg={errors.fullName} />}
          </Field>

          <Field label={t("register.email")} htmlFor="email">
            <input
              type="email"
              id="email"
              value={email}
              placeholder="you@company.com"
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              required
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t("register.password")} htmlFor="password">
              <div className="relative">
                <input
                  type={passwordShow.type}
                  id="password"
                  value={password}
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={togglePassword}
                  className="absolute inset-y-0 right-3 flex items-center text-uni-muted hover:text-white"
                  aria-label={t("register.password")}
                >
                  <img src={passwordShow.img} className="w-4" alt="" />
                </button>
              </div>
              {errors.password && <ErrorText msg={errors.password} />}
            </Field>

            <Field label={t("register.confirmPassword")} htmlFor="confirmPassword">
              <input
                type={passwordShow.type}
                id="confirmPassword"
                value={confirmPassword}
                placeholder="••••••••"
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input"
                required
              />
              {errors.confirmPassword && (
                <ErrorText msg={errors.confirmPassword} />
              )}
            </Field>
          </div>

          <label className="flex items-start gap-2 text-sm text-uni-muted select-none">
            <input
              type="checkbox"
              className="accent-uni-lime mt-0.5 w-4 h-4 rounded"
              required
            />
            <span>
              <Trans
                i18nKey="register.agree"
                components={{
                  terms: (
                    <a
                      href="#"
                      onClick={openTerms}
                      className="text-uni-cyan hover:text-uni-lime"
                    />
                  ),
                  privacy: (
                    <a
                      href="#"
                      onClick={openPrivacy}
                      className="text-uni-cyan hover:text-uni-lime"
                    />
                  ),
                }}
              />
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="auth-primary-btn"
          >
            {loading ? <Spinner /> : t("register.createAccount")}
          </button>

          <p className="text-center text-sm text-uni-muted pt-1">
            {t("register.haveAccount")}{" "}
            <Link
              to="/login"
              className="text-uni-cyan hover:text-uni-lime font-medium"
            >
              {t("register.signIn")}
            </Link>
          </p>
        </form>
        <Toaster />
      </AuthLayout>
    </>
  );
}

const ErrorText = ({ msg }) => (
  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
    {msg}
  </p>
);

export default Register;
