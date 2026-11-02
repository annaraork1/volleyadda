import React, { useState } from "react";
import { useRouter } from "expo-router";
import { Btn, Card, Chips, ErrorText, Field, H1, Muted, Screen, useAction } from "../../src/components/ui";
import { createTournament } from "../../src/api/client";
import { useAuth } from "../../src/context/AuthContext";
import { useLive } from "../../src/context/LiveContext";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

export default function CreateTournament() {
  const router = useRouter();
  const { isSignedIn, needsVerify } = useAuth();
  const { setSeason } = useLive();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [short, setShort] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [dates, setDates] = useState("");
  const [visibility, setVisibility] = useState<"link" | "public">("link");
  const [start, setStart] = useState<"registration" | "matches">("matches");
  const { busy, error, run } = useAction();

  const effKey = keyTouched ? key : slugify(name);
  const valid = name.trim().length > 1 && effKey.length >= 2;

  if (!isSignedIn) {
    return (
      <Screen>
        <H1>Create a tournament</H1>
        <Muted>You need an account to create and manage tournaments.</Muted>
        <Btn title="Sign in" onPress={() => router.replace({ pathname: "/auth/login", params: { next: "/tournament/create" } })} />
        <Btn title="Create account" variant="secondary" onPress={() => router.replace({ pathname: "/auth/signup", params: { next: "/tournament/create" } })} />
      </Screen>
    );
  }

  const submit = async () => {
    const ok = await run(async () => {
      await createTournament({
        key: effKey,
        name: name.trim(),
        short: short.trim() || name.trim().slice(0, 12),
        subtitle: subtitle.trim(),
        dates: dates.trim(),
        visibility,
        startAt: start === "matches" ? "matches" : undefined,
      });
      return true;
    });
    if (ok) {
      setSeason(effKey);
      router.replace("/admin");
    }
  };

  return (
    <Screen>
      <H1>Create a tournament</H1>
      <Muted>Start blank, then add teams, generate fixtures and score matches from the Organiser screen.</Muted>
      {needsVerify && (
        <Card>
          <Muted>Verify your email first (check your inbox). The server will not create tournaments for unverified accounts.</Muted>
        </Card>
      )}
      <Card>
        <Field label="Tournament name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="Tower Cup 2026" />
        <Field
          label="Link key"
          value={effKey}
          onChangeText={(t) => {
            setKeyTouched(true);
            setKey(slugify(t));
          }}
          hint="Lowercase letters, numbers and dashes. Used in share links."
        />
        <Field label="Short name" value={short} onChangeText={setShort} placeholder="TC26" />
        <Field label="Subtitle" value={subtitle} onChangeText={setSubtitle} autoCapitalize="sentences" />
        <Field label="Dates" value={dates} onChangeText={setDates} placeholder="12–13 Dec 2026" autoCapitalize="sentences" />
      </Card>
      <Card>
        <Muted>Who can find it?</Muted>
        <Chips
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: "link", label: "Link only" },
            { value: "public", label: "Public list" },
          ]}
        />
        <Muted>Start at</Muted>
        <Chips
          value={start}
          onChange={setStart}
          options={[
            { value: "matches", label: "Match scoring" },
            { value: "registration", label: "Player registration" },
          ]}
        />
      </Card>
      <ErrorText>{error}</ErrorText>
      <Btn title="Create tournament" onPress={submit} loading={busy} disabled={!valid} />
    </Screen>
  );
}
