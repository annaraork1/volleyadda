"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ReportForm() {
  const params = useSearchParams();
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          tournamentKey: params.get("season") || undefined,
          matchId: params.get("match") || undefined,
          practiceId: params.get("practice") || undefined,
        }),
      }).then((x) => x.json());
      if (!r.ok) {
        setError(r.error || "Could not send");
        if (r.error === "Sign in required") {
          /* keep message */
        }
        return;
      }
      setDone(true);
    } catch {
      setError("No connection");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="card auth-card">
          <h1>Report sent</h1>
          <p>Thanks. The VolleyAdda team will look at it.</p>
          <p className="auth-links">
            <Link href="/">Home</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={submit}>
        <h1>Report a problem</h1>
        <p>You need to be signed in.</p>
        <label>
          What went wrong?
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} required />
        </label>
        {error && (
          <p className="error">
            {error} {error.includes("Sign in") && <Link href="/auth/login?next=/report">Sign in</Link>}
          </p>
        )}
        <button className="btn primary" type="submit" disabled={busy}>
          Send
        </button>
      </form>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="empty">Loading…</div>}>
      <ReportForm />
    </Suspense>
  );
}
