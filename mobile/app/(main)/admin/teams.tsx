import React, { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import {
  Btn,
  Card,
  ErrorText,
  Field,
  H2,
  LiveGate,
  Muted,
  Row,
  Screen,
  TeamLogo,
  notify,
  useAction,
} from "../../../src/components/ui";
import { absoluteUrl } from "../../../src/api/absoluteUrl";
import { useLive } from "../../../src/context/LiveContext";
import type { Team } from "../../../src/shared";
import { colors, fonts, radius } from "../../../src/theme";

const PALETTE = [
  "#F5BC28",
  "#E4572E",
  "#2EAD6B",
  "#4CC9F0",
  "#A78BFA",
  "#FB923C",
  "#F87171",
  "#60A5FA",
  "#F472B6",
  "#34D399",
  "#FBBF24",
  "#818CF8",
  "#F97316",
  "#22D3EE",
  "#E879F9",
  "#94A3B8",
];

const DEFAULT_TEAM_LOGO = "/logo.png";

export default function AdminTeams() {
  const { refresh } = useLive();
  return (
    <Screen onRefresh={() => refresh(true)}>
      <LiveGate>{(state) => <Editor initial={state.config.teams} tkey={state.tournamentKey} />}</LiveGate>
    </Screen>
  );
}

function ColourPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const current = /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : PALETTE[0];
  const options = PALETTE.includes(current) ? PALETTE : [current, ...PALETTE];

  return (
    <View style={{ gap: 6, width: "100%" }}>
      <Text style={{ color: colors.muted, fontSize: 13, fontFamily: fonts.bodySemi }}>Colour</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((c) => {
          const on = c.toUpperCase() === current;
          return (
            <Pressable
              key={c}
              onPress={() => onChange(c)}
              accessibilityRole="button"
              accessibilityLabel={`Colour ${c}`}
              accessibilityState={{ selected: on }}
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.sm,
                backgroundColor: c,
                borderWidth: on ? 3 : 1,
                borderColor: on ? colors.text : colors.border,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

async function pickTeamLogoDataUrl(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    notify("Permission needed", "Allow photo access to set the team logo.");
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const out = await manipulateAsync(res.assets[0].uri, [{ resize: { width: 256 } }], {
    compress: 0.82,
    format: SaveFormat.JPEG,
    base64: true,
  });
  return out.base64 ? `data:image/jpeg;base64,${out.base64}` : null;
}

function Editor({ initial, tkey }: { initial: Team[]; tkey: string }) {
  const { act } = useLive();
  const [teams, setTeams] = useState<Team[]>(initial);
  const [logoBusy, setLogoBusy] = useState<string | null>(null);
  const { busy, error, run } = useAction();

  useEffect(() => {
    setTeams(initial);
  }, [tkey]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (i: number, p: Partial<Team>) => setTeams((ts) => ts.map((t, k) => (k === i ? { ...t, ...p } : t)));

  const add = () =>
    setTeams((ts) => {
      let n = ts.length + 1;
      while (ts.some((t) => t.id === `team${n}`)) n++;
      return [
        ...ts,
        {
          id: `team${n}`,
          name: `Team ${n}`,
          short: `T${n}`,
          color: PALETTE[(n - 1) % PALETTE.length],
          owner: "",
          logo: DEFAULT_TEAM_LOGO,
          squad: [],
        },
      ];
    });

  const changeLogo = async (i: number) => {
    const id = teams[i]?.id;
    if (!id) return;
    setLogoBusy(id);
    try {
      const dataUrl = await pickTeamLogoDataUrl();
      if (dataUrl) patch(i, { logo: dataUrl });
    } finally {
      setLogoBusy(null);
    }
  };

  const save = () =>
    run(async () => {
      await act({ type: "saveTeams", teams });
      notify("Teams saved");
    });

  return (
    <>
      <Muted>Add the teams that will play. Generate fixtures after saving. Squads come from the auction.</Muted>
      {teams.map((t, i) => {
        const logoUri = absoluteUrl(t.logo);
        const customLogo = !!t.logo && t.logo !== DEFAULT_TEAM_LOGO;
        return (
          <Card key={t.id}>
            <Row gap={12}>
              <TeamLogo logo={t.logo} color={t.color} size={40} />
              <H2 style={{ flex: 1 }}>{t.name || "Team"}</H2>
              <Btn title="Remove" variant="ghost" small onPress={() => setTeams((ts) => ts.filter((_, k) => k !== i))} />
            </Row>

            <Muted>Team logo</Muted>
            <Pressable onPress={() => void changeLogo(i)} style={{ alignSelf: "flex-start" }}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={{ width: 72, height: 72, borderRadius: 12 }} />
              ) : (
                <View
                  style={{
                    width: 72,
                    height: 72,
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
            <Row gap={8}>
              <Btn
                title={logoBusy === t.id ? "Uploading…" : customLogo ? "Change logo" : "Upload logo"}
                variant="secondary"
                small
                disabled={logoBusy === t.id}
                onPress={() => void changeLogo(i)}
              />
              {customLogo ? (
                <Btn title="Default logo" variant="ghost" small onPress={() => patch(i, { logo: DEFAULT_TEAM_LOGO })} />
              ) : null}
            </Row>

            <Field label="Team name" value={t.name} onChangeText={(v) => patch(i, { name: v })} autoCapitalize="words" />
            <Field label="Short" value={t.short} onChangeText={(v) => patch(i, { short: v.toUpperCase() })} />
            <ColourPicker value={t.color} onChange={(color) => patch(i, { color })} />
            <Field label="Owner" value={t.owner} onChangeText={(v) => patch(i, { owner: v })} autoCapitalize="words" />
          </Card>
        );
      })}
      <Btn title="Add team" variant="secondary" onPress={add} />
      <ErrorText>{error}</ErrorText>
      <Btn title="Save teams" onPress={save} loading={busy} disabled={teams.length < 2} />
    </>
  );
}
