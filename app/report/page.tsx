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
      <div className="card stack" style={{ maxWidth: 480, margin: "40px auto" }}>
        <h1>Report sent</h1>
        <p>Thanks. The VolleyAdda team will look at it.</p>
        <Link href="/">Home</Link>
      </div>
    );
  }

  return (
    <form className="card stack" onSubmit={submit} style={{ maxWidth: 480, margin: "40px auto" }}>
      <h1>Report a problem</h1>
      <p className="muted">You need to be signed in.</p>
      <label>
        What went wrong?
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} required />
      </label>
      {error && (
        <p className="err">
          {error} {error.includes("Sign in") && <Link href="/auth/login?next=/report">Sign in</Link>}
        </p>
      )}
      <button className="btn primary" type="submit" disabled={busy}>
        Send
      </button>
    </form>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="empty">Loading…</div>}>
      <ReportForm />
    </Suspense>
  );
}
