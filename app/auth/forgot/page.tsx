"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card stack" style={{ maxWidth: 420, margin: "40px auto" }}>
        <h1>Check your email</h1>
        <p>If that address has an account, we sent a reset link.</p>
        <Link href="/auth/login">Back to sign in</Link>
      </div>
    );
  }

  return (
    <form className="card stack" onSubmit={submit} style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1>Reset password</h1>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <button className="btn primary" type="submit" disabled={busy}>
        Send link
      </button>
      <Link href="/auth/login">Sign in</Link>
    </form>
  );
}
