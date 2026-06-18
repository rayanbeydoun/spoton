"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setBusy(false);
      setError(error.message);
    } else {
      // Full reload so the server picks up the new session cookie.
      window.location.assign("/");
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="text-2xl font-extrabold">Sign in to SpotOn</h1>

        {step === "email" ? (
          <>
            <p className="mt-1 text-sm text-muted">
              Enter your email and we&apos;ll send you a 6-digit code.
            </p>
            <form onSubmit={sendCode} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="label">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-primary">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? "Sending…" : "Send code"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              Enter the 6-digit code we sent to{" "}
              <span className="text-foreground">{email}</span>.
            </p>
            <form onSubmit={verifyCode} className="mt-6 space-y-4">
              <div>
                <label htmlFor="code" className="label">
                  Login code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  className="input text-center text-2xl tracking-[0.4em]"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              {error && <p className="text-sm text-primary">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? "Verifying…" : "Verify & sign in"}
              </button>
              <button
                type="button"
                className="btn-ghost w-full"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError("");
                }}
              >
                Use a different email
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
