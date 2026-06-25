import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { showPass, hidePass, googleLogo } from "@/assets";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import notify from "@/lib/toast";
import Toaster from "@/components/ui/Toaster";
import { doc, getDoc, setDoc } from "firebase/firestore";
import AuthLayout from "@/components/ui/AuthLayout";
import Field from "@/components/ui/Field";
import Spinner from "@/components/ui/Spinner";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passwordShow, setPasswordShow] = useState({
    type: "password",
    img: hidePass,
  });
  const navigate = useNavigate();
  const { t } = useTranslation();

  const togglePassword = () =>
    setPasswordShow((p) => ({
      ...p,
      type: p.type === "password" ? "text" : "password",
      img: p.img === hidePass ? showPass : hidePass,
    }));

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      notify.error(t("login.fillAllFields"));
      return;
    }
    setLoading(true);
    try {
      // The Firebase session (set by signInWithEmailAndPassword) is what
      // authenticates Firestore and drives routing via onAuthStateChanged.
      // No backend round-trip needed.
      await signInWithEmailAndPassword(auth, email, password);
      notify.success(t("login.signedIn"));
      navigate("/chat");
    } catch (error) {
      console.error(error);
      notify.error(t("login.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          fullName: user.displayName,
          email: user.email,
          id: user.uid,
          blocked: [],
        });
        // No userchats doc to seed: the index lives in the userchats/{uid}/items
        // subcollection, written server-side (rules deny client userchats writes).
      }

      // Send first-time users to profile setup, returning users straight to
      // chat. This explicit navigate runs after the auth state has settled, so
      // it wins over PublicRouter's "authenticated → /chat" redirect.
      notify.success(t("login.signedInGoogle"));
      const userData = (await getDoc(userDocRef)).data();
      if (!userData?.username) {
        navigate("/create-profile");
      } else {
        navigate("/chat");
      }
    } catch (error) {
      console.error(error);
      notify.error(t("login.googleFailed"));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout title={t("login.title")} subtitle={t("login.subtitle")}>
      <form onSubmit={handleLogin} className="space-y-4">
        <Field label={t("login.email")} htmlFor="email">
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

        <Field label={t("login.password")} htmlFor="password">
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
              aria-label={t("login.password")}
            >
              <img src={passwordShow.img} className="w-4" alt="" />
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-uni-muted cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-uni-lime w-4 h-4 rounded"
            />
            {t("login.rememberMe")}
          </label>
          <Link
            to="/forgot-password"
            className="text-uni-cyan hover:text-uni-lime font-medium"
          >
            {t("login.forgotPassword")}
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="auth-primary-btn"
        >
          {loading ? <Spinner /> : t("login.signIn")}
        </button>

        <div className="flex items-center gap-3 my-2 text-xs text-uni-muted">
          <span className="h-px flex-1 bg-uni-border" />
          {t("login.or")}
          <span className="h-px flex-1 bg-uni-border" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="auth-secondary-btn"
        >
          {googleLoading ? (
            <Spinner />
          ) : (
            <>
              <img src={googleLogo} alt="" className="w-4 h-4" />
              {t("login.continueGoogle")}
            </>
          )}
        </button>

        <p className="text-center text-sm text-uni-muted pt-2">
          {t("login.newToUnicomm")}{" "}
          <Link
            to="/register"
            className="text-uni-cyan hover:text-uni-lime font-medium"
          >
            {t("login.createAccount")}
          </Link>
        </p>
      </form>
      <Toaster />
    </AuthLayout>
  );
}

export default Login;
