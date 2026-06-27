import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import notify from "@/lib/toast";
import Toaster from "@/components/ui/Toaster";
import AuthLayout from "@/components/ui/AuthLayout";
import Field from "@/components/ui/Field";
import Spinner from "@/components/ui/Spinner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      notify.error("Please enter your email.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
      notify.success("Reset link sent — check your inbox.");
      setTimeout(() => navigate("/login"), 3500);
    } catch (error) {
      console.error(error);
      notify.error("Could not send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={"Forgot your password?"} subtitle={"Enter the email tied to your account and we'll send you a reset link."}>
      {sent ? (
        <div className="flex flex-col items-center text-center py-2">
          <div className="w-14 h-14 rounded-2xl bg-brand-soft border border-uni-gold/20 flex items-center justify-center text-uni-gold mb-4">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-uni-text">
            {"Check your inbox"}
          </h2>
          <p className="text-sm text-uni-muted mt-1.5 leading-relaxed">
            {"We've sent a password reset link to"} <br />
            <span className="text-uni-text">{email}</span>
          </p>
          <Link
            to="/login"
            className="mt-5 auth-secondary-btn inline-flex justify-center"
          >
            {"Back to sign in"}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <button type="submit" disabled={loading} className="auth-primary-btn">
            {loading ? <Spinner /> : "Send reset link"}
          </button>

          <p className="text-center text-sm text-uni-muted pt-1">
            {"Remembered it?"}{" "}
            <Link
              to="/login"
              className="text-uni-blue hover:text-uni-gold font-semibold"
            >
              {"Back to sign in"}
            </Link>
          </p>
        </form>
      )}
      <Toaster />
    </AuthLayout>
  );
};

export default ForgotPassword;
