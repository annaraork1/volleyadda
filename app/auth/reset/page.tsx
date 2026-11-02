"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      }).then((x) => x.json());
      if (!r.ok) {
        setError(r.error || "Could not reset");
        return;
      }
      router.push("/");
    } catch {
      setError("No connection");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card stack" onSubmit={submit} style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1>Choose a new password</h1>
      <label>
        New password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
      </label>
      {error && <p className="err">{error}</p>}
      <button className="btn primary" type="submit" disabled={busy || !token}>
        Save password
      </button>
      <Link href="/auth/login">Sign in</Link>
    </form>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="empty">Loading…</div>}>
      <ResetInner />
    </Suspense>
  );
}
