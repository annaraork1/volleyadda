"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Me = {
  ok: boolean;
  superadmin?: boolean;
  user?: { email: string; name: string; emailVerified?: boolean; providers?: string[] };
  error?: string;
};

export default function AccountPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const m = (await fetch("/api/auth/me").then((r) => r.json())) as Me;
    setMe(m);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function logout() {
    setBusy(true);
    setError("");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/auth/login");
      router.refresh();
    } catch {
      setError("Could not sign out");
      setBusy(false);
    }
  }

  if (!me) {
    return (
      <main className="wrap">
        <div className="empty">Loading…</div>
      </main>
    );
  }

  if (!me.ok || !me.user) {
    return (
      <main className="wrap">
        <div className="card stack" style={{ maxWidth: 420, margin: "40px auto" }}>
          <h1>Account</h1>
          <p className="muted">You are not signed in.</p>
          <Link className="btn primary" href="/auth/login?next=/account">
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div className="card stack" style={{ maxWidth: 420, margin: "40px auto" }}>
        <h1>Account</h1>
        <p>
          Signed in as <b>{me.user.name}</b>
        </p>
        <p className="muted" style={{ margin: 0 }}>
          {me.user.email}
          {me.user.emailVerified ? " · verified" : " · email not verified"}
          {me.user.providers?.length ? ` · ${me.user.providers.join(", ")}` : ""}
        </p>
        {me.superadmin && (
          <p>
            <Link href="/superadmin">Open superadmin</Link>
          </p>
        )}
        {error && <p className="error">{error}</p>}
        <button className="btn" type="button" disabled={busy} onClick={() => void logout()}>
          {busy ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </main>
  );
}
