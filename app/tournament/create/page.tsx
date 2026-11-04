"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useLive } from "@/components/LiveProvider";
import { fileToLogoDataUrl } from "@/lib/logoUpload";
import { createTournament, listMyTournaments, type TournamentListItem } from "@/lib/tournamentApi";

const WIZARD = ["Details", "Teams", "Registration", "Rules", "Fixtures", "Invite staff", "Go live"] as const;

export default function CreateTournamentPage() {
  const router = useRouter();
  const { setSeason } = useLive();
  const [me, setMe] = useState<{ ok: boolean; user?: { emailVerified?: boolean } } | null>(null);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [dates, setDates] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"link" | "public">("link");
  const [mode, setMode] = useState<"blank" | "clone">("blank");
  const [cloneFrom, setCloneFrom] = useState("");
  const [mine, setMine] = useState<TournamentListItem[]>([]);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [startAt, setStartAt] = useState<"registration" | "auction" | "matches">("registration");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ ok: false }));
  }, []);

  const loadMine = useCallback(async () => {
    if (!me?.ok) return;
    try {
      setMine((await listMyTournaments()).filter((t) => t.role === "organiser"));
    } catch {
      setMine([]);
    }
  }, [me?.ok]);

  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  if (me === null) return <p className="muted">Checking account…</p>;

  if (!me.ok) {
    return (
      <div className="card stack">
        <h1>Create a tournament</h1>
        <p className="muted">You need an account to create and manage tournaments.</p>
        <Link className="btn gold" href="/auth/login?next=/tournament/create">
          Sign in
        </Link>
        <Link className="btn" href="/auth/signup?next=/tournament/create">
          Create account
        </Link>
      </div>
    );
  }

  if (me.user && me.user.emailVerified === false) {
    return (
      <div className="card stack">
        <h1>Verify your email</h1>
        <p className="muted">Verify your email before creating a tournament.</p>
        <Link className="btn" href="/account">
          Account
        </Link>
      </div>
    );
  }

  const detailsValid = name.trim().length > 1 && !!logo;

  const submit = async () => {
    if (!logo) {
      setError("Upload a tournament logo to continue.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const created = await createTournament({
        name: name.trim(),
        short: short.trim() || name.trim().slice(0, 12),
        subtitle: subtitle.trim(),
        dates: dates.trim(),
        logo,
        visibility,
        mode,
        cloneFrom: mode === "clone" ? cloneFrom || undefined : undefined,
        startAt,
        registrationOpen,
      });
      setSeason(created.key);
      router.replace(`/tournament/${created.key}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack" style={{ gap: 16, maxWidth: 560, width: "100%" }}>
      <h1>Create tournament</h1>
      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        {WIZARD.map((label, i) => (
          <button
            key={label}
            type="button"
            className={i === step ? "btn gold" : "btn"}
            onClick={() => setStep(i)}
            disabled={i > 0 && !detailsValid && i < WIZARD.length - 1}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="card form">
          <h2>Details</h2>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tournament name" />
          </label>
          <label>
            Short name
            <input value={short} onChange={(e) => setShort(e.target.value)} placeholder="Optional short" />
          </label>
          <label>
            Subtitle
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </label>
          <label>
            Dates
            <input value={dates} onChange={(e) => setDates(e.target.value)} placeholder="e.g. Nov 2026" />
          </label>
          <label>
            Logo (required)
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  setLogo(await fileToLogoDataUrl(f));
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Logo upload failed");
                }
              }}
            />
          </label>
          {logo && <img src={logo} alt="" width={72} height={72} className="logo" />}
          <label>
            Visibility
            <select value={visibility} onChange={(e) => setVisibility(e.target.value as "link" | "public")}>
              <option value="link">Link only (default)</option>
              <option value="public">Public browse</option>
            </select>
          </label>
          <label>
            Start from
            <select value={startAt} onChange={(e) => setStartAt(e.target.value as typeof startAt)}>
              <option value="registration">Registration</option>
              <option value="auction">Auction</option>
              <option value="matches">Matches</option>
            </select>
          </label>
          <label>
            <input type="checkbox" checked={registrationOpen} onChange={(e) => setRegistrationOpen(e.target.checked)} />
            Registration open at create
          </label>
          <label>
            Mode
            <select value={mode} onChange={(e) => setMode(e.target.value as "blank" | "clone")}>
              <option value="blank">Blank</option>
              <option value="clone">Clone past tournament</option>
            </select>
          </label>
          {mode === "clone" && (
            <label>
              Clone from
              <select value={cloneFrom} onChange={(e) => setCloneFrom(e.target.value)}>
                <option value="">Select…</option>
                {mine.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {step > 0 && step < WIZARD.length - 1 && (
        <div className="card stack">
          <h2>{WIZARD[step]}</h2>
          <p className="muted">
            You can finish these after go-live from Organiser. Continue to create the tournament first.
          </p>
          <button type="button" className="btn gold" onClick={() => setStep(WIZARD.length - 1)}>
            Skip to Go live
          </button>
        </div>
      )}

      {step === WIZARD.length - 1 && (
        <div className="card stack">
          <h2>Go live</h2>
          <p className="muted">
            We&apos;ll assign an internal key and share code. Logo is required. Default visibility is link-only.
          </p>
          {!detailsValid && <p className="error">Fill Details (name + logo) first.</p>}
          <button type="button" className="btn gold" disabled={!detailsValid || busy} onClick={() => void submit()}>
            {busy ? "Creating…" : "Create tournament"}
          </button>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <div className="row" style={{ gap: 8 }}>
        {step > 0 && (
          <button type="button" className="btn" onClick={() => setStep((s) => s - 1)}>
            Back
          </button>
        )}
        {step < WIZARD.length - 1 && (
          <button
            type="button"
            className="btn gold"
            disabled={step === 0 && !detailsValid}
            onClick={() => setStep((s) => s + 1)}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
