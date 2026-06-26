import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

  const togglePassword = () =>
    setPasswordShow((p) => ({
      ...p,
      type: p.type === "password" ? "text" : "password",
      img: p.img === hidePass ? showPass : hidePass,
    }));

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      notify.error("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      // The Firebase session (set by signInWithEmailAndPassword) is what
      // authenticates Firestore and drives routing via onAuthStateChanged.
      // No backend round-trip needed.
      await signInWithEmailAndPassword(auth, email, password);
      notify.success("Signed in. Redirecting…");
      navigate("/home");
    } catch (error) {
      console.error(error);
      notify.error("Invalid email or password.");
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
      notify.success("Signed in with Google");
      const userData = (await getDoc(userDocRef)).data();
      if (!userData?.username) {
        navigate("/create-profile");
      } else {
        navigate("/home");
      }
    } catch (error) {
      console.error(error);
      notify.error("Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout title={"Welcome back"} subtitle={"Sign in to continue praying together."}>
      <form onSubmit={handleLogin} className="space-y-4">
        <Field label={"Email"} htmlFor="email">
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

        <Field label={"Password"} htmlFor="password">
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
              className="absolute inset-y-0 right-3 flex items-center text-uni-muted hover:text-uni-text"
              aria-label={"Password"}
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
            {"Remember me"}
          </label>
          <Link
            to="/forgot-password"
            className="text-uni-cyan hover:text-uni-lime font-medium"
          >
            {"Forgot password?"}
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="auth-primary-btn"
        >
          {loading ? <Spinner /> : "Sign in"}
        </button>

        <div className="flex items-center gap-3 my-2 text-xs text-uni-muted">
          <span className="h-px flex-1 bg-uni-border" />
          {"OR"}
          <span className="h-px flex-1 bg-uni-border" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="auth-secondary-btn text-black"
        >
          {googleLoading ? (
            <Spinner />
          ) : (
            <>
              <img src={googleLogo} alt="" className="w-4 h-4" />
              {"Continue with Google"}
            </>
          )}
        </button>

        <p className="text-center text-sm text-uni-muted pt-2">
          {"New to 2Gather?"}{" "}
          <Link
            to="/register"
            className="text-uni-cyan hover:text-uni-lime font-medium"
          >
            {"Create an account"}
          </Link>
        </p>
      </form>
      <Toaster />
    </AuthLayout>
  );
}

export default Login;
