"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { insforge, notifyAuthChanged } from "@/lib/insforge";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [tab, setTab] = useState<"signin" | "signup">("signin");

  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signinError, setSigninError] = useState<string | null>(null);
  const [signinLoading, setSigninLoading] = useState(false);

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);

  const [pendingVerification, setPendingVerification] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  function goToNext() {
    notifyAuthChanged();
    router.push(next || "/profile");
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setSigninError(null);

    if (!signinEmail.includes("@") || !signinPassword) {
      setSigninError("Enter a valid email and password.");
      return;
    }

    setSigninLoading(true);
    const { error } = await insforge.auth.signInWithPassword({
      email: signinEmail,
      password: signinPassword,
    });
    setSigninLoading(false);

    if (error) {
      setSigninError(error.message || "Invalid email or password.");
      return;
    }

    goToNext();
  }

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setSignupError(null);

    if (!signupName.trim()) {
      setSignupError("Enter your full name.");
      return;
    }
    if (!signupEmail.includes("@")) {
      setSignupError("Enter a valid email address.");
      return;
    }
    if (signupPassword.length < 6) {
      setSignupError("Password must be at least 6 characters.");
      return;
    }

    setSignupLoading(true);
    const { data, error } = await insforge.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      name: signupName.trim(),
    });
    setSignupLoading(false);

    if (error) {
      setSignupError(error.message || "Could not create account.");
      return;
    }

    if (data?.requireEmailVerification) {
      setPendingVerification(true);
      return;
    }

    goToNext();
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setVerifyError(null);

    if (verifyCode.trim().length !== 6) {
      setVerifyError("Enter the 6-digit code from your email.");
      return;
    }

    setVerifyLoading(true);
    const { error } = await insforge.auth.verifyEmail({
      email: signupEmail,
      otp: verifyCode.trim(),
    });
    setVerifyLoading(false);

    if (error) {
      setVerifyError(error.message || "Invalid or expired code.");
      return;
    }

    goToNext();
  }

  if (pendingVerification) {
    return (
      <div className="container">
        <div className="auth-card">
          <div className="checkout-section__title" style={{ marginBottom: "0.5rem" }}>
            Verify your email
          </div>
          <p className="dummy-note" style={{ marginBottom: "1.5rem" }}>
            We sent a 6-digit code to {signupEmail}. Enter it below to finish
            creating your account.
          </p>
          <form onSubmit={handleVerify}>
            <div className={`field ${verifyError ? "field--error" : ""}`}>
              <label htmlFor="verify-code">Verification Code</label>
              <input
                id="verify-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                autoComplete="one-time-code"
              />
              {verifyError && <span className="field__error">{verifyError}</span>}
            </div>
            <button
              type="submit"
              className="btn btn--primary btn--full"
              disabled={verifyLoading}
            >
              {verifyLoading ? "Verifying…" : "Verify Email"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === "signin" ? "is-active" : ""}`}
            onClick={() => setTab("signin")}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === "signup" ? "is-active" : ""}`}
            onClick={() => setTab("signup")}
          >
            Create Account
          </button>
        </div>

        {tab === "signin" ? (
          <form onSubmit={handleSignIn}>
            <div className="field">
              <label htmlFor="signin-email">Email</label>
              <input
                id="signin-email"
                type="email"
                autoComplete="email"
                value={signinEmail}
                onChange={(e) => setSigninEmail(e.target.value)}
              />
            </div>
            <div className={`field ${signinError ? "field--error" : ""}`}>
              <label htmlFor="signin-password">Password</label>
              <input
                id="signin-password"
                type="password"
                autoComplete="current-password"
                value={signinPassword}
                onChange={(e) => setSigninPassword(e.target.value)}
              />
              {signinError && <span className="field__error">{signinError}</span>}
            </div>
            <button
              type="submit"
              className="btn btn--primary btn--full"
              disabled={signinLoading}
            >
              {signinLoading ? "Signing In…" : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp}>
            <div className="field">
              <label htmlFor="signup-name">Full Name</label>
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
              />
            </div>
            <div className={`field ${signupError ? "field--error" : ""}`}>
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
              />
              {signupError && <span className="field__error">{signupError}</span>}
            </div>
            <button
              type="submit"
              className="btn btn--primary btn--full"
              disabled={signupLoading}
            >
              {signupLoading ? "Creating Account…" : "Create Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
