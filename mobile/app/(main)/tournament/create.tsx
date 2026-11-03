import React, { useCallback, useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import {
  Btn,
  Card,
  Chips,
  ErrorText,
  Field,
  H1,
  H2,
  Muted,
  Screen,
  notify,
  useAction,
} from "../../../src/components/ui";
import { createTournament, listMyTournaments, type TournamentListItem } from "../../../src/api/client";
import { useAuth } from "../../../src/context/AuthContext";
import { useLive } from "../../../src/context/LiveContext";
import { colors } from "../../../src/theme";

const WIZARD = ["Details", "Teams", "Registration", "Rules", "Fixtures", "Invite staff", "Go live"] as const;

export default function CreateTournament() {
  const router = useRouter();
  const { isSignedIn, needsVerify } = useAuth();
  const { setSeason } = useLive();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [dates, setDates] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"link" | "public">("link");
  const [mode, setMode] = useState<"blank" | "clone">("blank");
  const [cloneFrom, setCloneFrom] = useState<string>("");
  const [mine, setMine] = useState<TournamentListItem[]>([]);
  const [registrationOpen, setRegistrationOpen] = useState<"yes" | "no">("yes");
  const [startAt, setStartAt] = useState<"registration" | "auction" | "matches">("registration");
  const { busy, error, run } = useAction();

  const loadMine = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const list = await listMyTournaments();
      setMine(list.filter((t) => t.role === "organiser"));
    } catch {
      setMine([]);
    }
  }, [isSignedIn]);

  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      notify("Permission needed", "Allow photo access to set the tournament logo.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const out = await manipulateAsync(res.assets[0].uri, [{ resize: { width: 256 } }], {
      compress: 0.82,
      format: SaveFormat.JPEG,
      base64: true,
    });
    if (out.base64) setLogo(`data:image/jpeg;base64,${out.base64}`);
  };

  const detailsValid = name.trim().length > 1 && !!logo;

  if (!isSignedIn) {
    return (
      <Screen>
        <H1>Create a tournament</H1>
        <Muted>You need an account to create and manage tournaments.</Muted>
        <Btn title="Sign in" onPress={() => router.replace({ pathname: "/auth/login", params: { next: "/tournament/create" } })} />
        <Btn
          title="Create account"
          variant="secondary"
          onPress={() => router.replace({ pathname: "/auth/signup", params: { next: "/tournament/create" } })}
        />
      </Screen>
    );
  }

  const submit = async () => {
    if (!logo) {
      notify("Logo required", "Upload a tournament logo to continue.");
      return;
    }
    const created = await run(async () =>
      createTournament({
        name: name.trim(),
        short: short.trim() || name.trim().slice(0, 12),
        subtitle: subtitle.trim(),
        dates: dates.trim(),
        logo,
        visibility,
        mode,
        cloneFrom: mode === "clone" ? cloneFrom || undefined : undefined,
        startAt,
        registrationOpen: registrationOpen === "yes",
      }),
    );
    if (!created) return;
    setSeason(created.key);
    router.replace(`/tournament/${created.key}`);
  };

  return (
    <Screen>
      <H1>Create a tournament</H1>
      <Muted>A share link and short code are generated for you — no need to invent a key.</Muted>

      <Card>
        <Muted>Setup wizard</Muted>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {WIZARD.map((label, i) => (
            <Pressable key={label} onPress={() => (i === 0 || detailsValid ? setStep(i) : null)}>
              <Text
                style={{
                  color: i === step ? colors.accent : colors.muted,
                  fontWeight: i === step ? "700" : "500",
                  fontSize: 13,
                }}
              >
                {i + 1}. {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {needsVerify && (
        <Card>
          <Muted>Verify your email first (check your inbox). The server will not create tournaments for unverified accounts.</Muted>
        </Card>
      )}

      {step === 0 && (
        <>
          <Card>
            <H2>Details</H2>
            <Field label="Tournament name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="Tower Cup 2026" />
            <Field label="Short name" value={short} onChangeText={setShort} placeholder="TC26" />
            <Field label="Subtitle" value={subtitle} onChangeText={setSubtitle} autoCapitalize="sentences" />
            <Field label="Dates" value={dates} onChangeText={setDates} placeholder="12–13 Dec 2026" autoCapitalize="sentences" />

            <Muted>Logo (required)</Muted>
            <Pressable onPress={() => void pickLogo()} style={{ alignSelf: "flex-start" }}>
              {logo ? (
                <Image source={{ uri: logo }} style={{ width: 88, height: 88, borderRadius: 12 }} />
              ) : (
                <View
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 12,
                    backgroundColor: colors.cardAlt,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                  }}
                >
                  <Text style={{ color: colors.muted, textAlign: "center", fontSize: 12 }}>Tap to upload</Text>
                </View>
              )}
            </Pressable>
            <Btn title={logo ? "Change logo" : "Upload logo"} variant="secondary" small onPress={() => void pickLogo()} />
          </Card>

          <Card>
            <Muted>Start from</Muted>
            <Chips
              value={mode}
              onChange={(m) => {
                setMode(m);
                if (m === "clone" && !cloneFrom && mine[0]) setCloneFrom(mine[0].key);
              }}
              options={[
                { value: "blank", label: "Blank" },
                { value: "clone", label: "Clone past season" },
              ]}
            />
            {mode === "clone" && (
              <>
                {mine.length === 0 ? (
                  <Muted>No past tournaments to clone yet.</Muted>
                ) : (
                  <Chips
                    value={cloneFrom || mine[0]?.key || ""}
                    onChange={setCloneFrom}
                    options={mine.map((t) => ({ value: t.key, label: t.short || t.name }))}
                  />
                )}
                <Muted>Copies teams and rules; clears scores and fixtures.</Muted>
              </>
            )}
            <Muted>Who can find it?</Muted>
            <Chips
              value={visibility}
              onChange={setVisibility}
              options={[
                { value: "link", label: "Link only" },
                { value: "public", label: "Public list" },
              ]}
            />
          </Card>

          <Card>
            <Muted>Player registration</Muted>
            <Chips
              value={registrationOpen}
              onChange={setRegistrationOpen}
              options={[
                { value: "yes", label: "Open at create" },
                { value: "no", label: "Closed" },
              ]}
            />
            <Muted>You can stop registration before the auction starts from Organiser.</Muted>
            <Muted>Start stage</Muted>
            <Chips
              value={startAt}
              onChange={setStartAt}
              options={[
                { value: "registration", label: "Registration" },
                { value: "auction", label: "Auction" },
                { value: "matches", label: "Matches" },
              ]}
            />
            <Muted>Stages are skippable later — pick where you want to begin.</Muted>
          </Card>

          <Btn title="Next: review setup path" onPress={() => setStep(1)} disabled={!detailsValid} />
        </>
      )}

      {step > 0 && step < WIZARD.length - 1 && (
        <Card style={{ gap: 10 }}>
          <H2>{WIZARD[step]}</H2>
          <Muted>
            After you create the tournament you will finish {WIZARD[step].toLowerCase()} from the tournament page and
            Organiser tools. Minimum create only needs details + logo.
          </Muted>
          <Btn title="Back to details" variant="secondary" onPress={() => setStep(0)} />
          <Btn title="Skip to create" onPress={() => setStep(WIZARD.length - 1)} disabled={!detailsValid} />
        </Card>
      )}

      {step === WIZARD.length - 1 && (
        <Card style={{ gap: 10 }}>
          <H2>Go live</H2>
          <Muted>
            Creates “{name.trim() || "…"}” with an auto key, share code, and {visibility === "public" ? "public" : "link-only"}{" "}
            visibility. You can invite staff and finish teams/fixtures next.
          </Muted>
          <ErrorText>{error}</ErrorText>
          <Btn title="Create tournament" onPress={() => void submit()} loading={busy} disabled={!detailsValid || needsVerify} />
          <Btn title="Back" variant="ghost" onPress={() => setStep(0)} />
        </Card>
      )}
    </Screen>
  );
}
