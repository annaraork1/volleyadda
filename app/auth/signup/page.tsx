"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleSignIn } from "@/components/GoogleSignIn";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      }).then((x) => x.json());
      if (!r.ok) {
        setError(r.error || "Could not sign up");
        return;
      }
      router.push(r.needsVerify ? "/auth/check-email" : "/");
      router.refresh();
    } catch {
      setError("No connection");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={submit}>
        <h1>Join VolleyAdda</h1>
        <p>Score matches and run volleyball tournaments.</p>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Password (8+ characters)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
        <GoogleSignIn text="signup_with" onError={setError} />
        <p className="auth-links">
          Already have an account? <Link href="/auth/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
