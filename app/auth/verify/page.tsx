"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [msg, setMsg] = useState("Verifying…");

  useEffect(() => {
    if (!token) {
      setMsg("Missing token");
      return;
    }
    fetch("/api/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setMsg("Email verified. Redirecting…");
          setTimeout(() => router.push("/"), 800);
        } else setMsg(j.error || "Could not verify");
      })
      .catch(() => setMsg("No connection"));
  }, [token, router]);

  return (
    <div className="card stack" style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1>Email verification</h1>
      <p>{msg}</p>
      <Link href="/">Home</Link>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="empty">Loading…</div>}>
      <VerifyInner />
    </Suspense>
  );
}
