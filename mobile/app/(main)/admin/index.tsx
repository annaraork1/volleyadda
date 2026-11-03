import React, { useCallback, useEffect, useState } from "react";
import { Share, Text } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import {
  Btn,
  Card,
  Chips,
  ErrorText,
  Field,
  H2,
  LiveGate,
  Muted,
  Pill,
  Screen,
  confirmDialog,
  notify,
  useAction,
} from "../../../src/components/ui";
import { API_BASE, joinApiUrl } from "../../../src/api/absoluteUrl";
import { fetchTournamentAccess, type TournamentAccess } from "../../../src/api/client";
import { useAuth } from "../../../src/context/AuthContext";
import { useLive } from "../../../src/context/LiveContext";
import type { Config, SeasonStage } from "../../../src/shared";
import { colors } from "../../../src/theme";

const STAGES: { value: SeasonStage; label: string }[] = [
  { value: "registration", label: "Registration" },
  { value: "auction", label: "Auction" },
  { value: "fixtures", label: "Fixtures" },
  { value: "matches", label: "Matches" },
  { value: "completed", label: "Completed" },
];

export default function Admin() {
  const router = useRouter();
  const { isSignedIn, user } = useAuth();
  const { refresh } = useLive();

  if (!isSignedIn) {
    return (
      <Screen>
        <H2>Organiser tools</H2>
        <Muted>Sign in with an organiser account to manage this tournament.</Muted>
        <Btn title="Sign in" onPress={() => router.push({ pathname: "/auth/login", params: { next: "/admin" } })} />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={() => refresh(true)}>
      <LiveGate>
        {(state) => <AdminBody config={state.config} tkey={state.tournamentKey} email={user?.email ?? ""} />}
      </LiveGate>
    </Screen>
  );
}

function AdminBody({ config, tkey, email }: { config: Config; tkey: string; email: string }) {
  const router = useRouter();
  const { act } = useLive();
  const t = config.tournament;
  const [name, setName] = useState(t.name);
  const [short, setShort] = useState(t.short);
  const [subtitle, setSubtitle] = useState(t.subtitle);
  const [dates, setDates] = useState(t.dates);
  const stage = (config.stage || "matches") as SeasonStage;
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"scorer" | "auctioneer" | "organiser" | "owner">("scorer");
  const [inviteTeam, setInviteTeam] = useState(config.teams[0]?.id ?? "");
  const [pinTeam, setPinTeam] = useState(config.teams[0]?.id ?? "");
  const [pin, setPin] = useState("");
  const [vis, setVis] = useState<"link" | "public">("link");
  const [scorerPin, setScorerPin] = useState("");
  const [access, setAccess] = useState<TournamentAccess | null>(null);
  const details = useAction();
  const stageA = useAction();
  const inviteA = useAction();
  const pinA = useAction();
  const visA = useAction();
  const accessA = useAction();

  const loadAccess = useCallback(async () => {
    try {
      setAccess(await fetchTournamentAccess(tkey));
    } catch {
      setAccess(null);
    }
  }, [tkey]);

  useEffect(() => {
    setName(t.name);
    setShort(t.short);
    setSubtitle(t.subtitle);
    setDates(t.dates);
    void loadAccess();
  }, [tkey]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveDetails = () =>
    details.run(async () => {
      await act({ type: "saveTournament", tournament: { name, short, subtitle, dates } });
      notify("Saved");
    });

  const setStage = async (to: SeasonStage) => {
    if (to === stage) return;
    const ok = await confirmDialog("Change stage?", `Move this tournament to “${to}”?`, "Change");
    if (!ok) return;
    await stageA.run(async () => {
      await act({ type: "setStage", to, confirm: to, by: email, force: true });
    });
  };

  return (
    <>
      <Card>
        <Text style={{ color: colors.muted, fontSize: 12 }}>TOURNAMENT KEY</Text>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{tkey}</Text>
        <Muted>Share: {API_BASE}/s/{tkey}</Muted>
      </Card>

      <Card>
        <H2>Workflow stage</H2>
        <Pill text={stage} />
        <Muted>Registration → Auction → Fixtures → Matches → Completed. Every stage is skippable when you do not need it.</Muted>
        <Chips value={stage} onChange={setStage} options={STAGES} />
        <ErrorText>{stageA.error}</ErrorText>
      </Card>

      <Card>
        <H2>Access</H2>
        <Muted>Venue scorer PIN, fixture lock, invites, and share. One rotatable scorer PIN per tournament.</Muted>
        {access?.organiserNotices?.[0] && (
          <Muted>
            Latest: {access.organiserNotices[0].message} ({access.organiserNotices[0].byEmail})
          </Muted>
        )}
        <Field
          label="Venue scorer PIN"
          value={scorerPin}
          onChangeText={setScorerPin}
          secureTextEntry
          keyboardType="number-pad"
          hint={access?.hasScorerPin ? "A PIN is set — enter a new one to rotate." : "4–12 characters. Optional fallback for devices without login."}
        />
        <ErrorText>{accessA.error}</ErrorText>
        <Btn
          title={access?.hasScorerPin ? "Update scorer PIN" : "Set scorer PIN"}
          variant="secondary"
          loading={accessA.busy}
          disabled={scorerPin.trim().length < 4}
          onPress={() =>
            accessA.run(async () => {
              await act({ type: "setTournamentScorerPin", pin: scorerPin.trim() });
              setScorerPin("");
              await loadAccess();
              notify("Scorer PIN saved");
            })
          }
        />
        {access?.hasScorerPin && (
          <Btn
            title="Disable scorer PIN"
            variant="ghost"
            onPress={() =>
              accessA.run(async () => {
                await act({ type: "clearTournamentScorerPin" });
                await loadAccess();
                notify("Scorer PIN cleared");
              })
            }
          />
        )}
        <Muted>Fixture edits by scorers</Muted>
        <Chips
          value={access?.fixturesLocked ? "locked" : "open"}
          onChange={(v) =>
            accessA.run(async () => {
              await act({ type: "setFixturesLocked", locked: v === "locked" });
              await loadAccess();
              notify(v === "locked" ? "Fixtures locked" : "Fixtures unlocked");
            })
          }
          options={[
            { value: "open", label: "Scorers can edit" },
            { value: "locked", label: "Locked" },
          ]}
        />
        <Btn
          title="Share tournament link"
          variant="ghost"
          onPress={() => {
            const web = joinApiUrl(`/s/${tkey}`);
            const app = Linking.createURL(`tournament/${tkey}`);
            void Share.share({ message: `${t.name}\n${web}\nApp: ${app}`, url: web, title: t.name });
          }}
        />
        <Btn title="Tournament page" variant="ghost" onPress={() => router.push(`/tournament/${tkey}`)} />
      </Card>

      <Card>
        <H2>Tournament details</H2>
        <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label="Short name" value={short} onChangeText={setShort} />
        <Field label="Subtitle" value={subtitle} onChangeText={setSubtitle} autoCapitalize="sentences" />
        <Field label="Dates" value={dates} onChangeText={setDates} autoCapitalize="sentences" />
        <ErrorText>{details.error}</ErrorText>
        <Btn title="Save details" onPress={saveDetails} loading={details.busy} />
      </Card>

      <Card>
        <H2>Set up</H2>
        <Btn title="Teams" variant="secondary" onPress={() => router.push("/admin/teams")} />
        <Btn title="Generate fixtures" variant="secondary" onPress={() => router.push("/admin/fixtures")} />
        <Btn title="Match rules & points" variant="secondary" onPress={() => router.push("/admin/rules")} />
        <Btn title="Player registrations" variant="secondary" onPress={() => router.push("/admin/registrations")} />
        <Btn title="Auction console" variant="secondary" onPress={() => router.push("/auction/console")} />
      </Card>

      <Card>
        <H2>Visibility</H2>
        <Chips
          value={vis}
          onChange={setVis}
          options={[
            { value: "link", label: "Link only" },
            { value: "public", label: "Public list" },
          ]}
        />
        <ErrorText>{visA.error}</ErrorText>
        <Btn
          title="Update visibility"
          variant="secondary"
          loading={visA.busy}
          onPress={() =>
            visA.run(async () => {
              await act({ type: "setTournamentVisibility", visibility: vis });
              notify("Visibility updated");
            })
          }
        />
      </Card>

      <Card>
        <H2>Invite someone</H2>
        <Muted>They must already have a VolleyAdda account with this email.</Muted>
        <Field label="Email" value={inviteEmail} onChangeText={setInviteEmail} keyboardType="email-address" />
        <Chips
          value={inviteRole}
          onChange={setInviteRole}
          options={[
            { value: "scorer", label: "Scorer" },
            { value: "auctioneer", label: "Auctioneer" },
            { value: "organiser", label: "Organiser" },
            { value: "owner", label: "Team owner" },
          ]}
        />
        {inviteRole === "owner" && (
          <Chips
            value={inviteTeam}
            onChange={setInviteTeam}
            options={config.teams.map((x) => ({ value: x.id, label: x.short || x.name }))}
          />
        )}
        <ErrorText>{inviteA.error}</ErrorText>
        <Btn
          title="Send invite"
          loading={inviteA.busy}
          disabled={!inviteEmail.includes("@")}
          onPress={() =>
            inviteA.run(async () => {
              await act({
                type: "inviteMember",
                email: inviteEmail.trim(),
                role: inviteRole,
                ...(inviteRole === "owner" ? { teamId: inviteTeam } : {}),
              });
              setInviteEmail("");
              notify("Invite saved");
            })
          }
        />
      </Card>

      {config.teams.length > 0 && (
        <Card>
          <H2>Team owner PIN</H2>
          <Muted>Owners can bid in the auction with this PIN (4–12 characters).</Muted>
          <Chips
            value={pinTeam}
            onChange={setPinTeam}
            options={config.teams.map((x) => ({ value: x.id, label: x.short || x.name }))}
          />
          <Field label="New PIN" value={pin} onChangeText={setPin} secureTextEntry />
          <ErrorText>{pinA.error}</ErrorText>
          <Btn
            title="Set owner PIN"
            variant="secondary"
            loading={pinA.busy}
            disabled={pin.trim().length < 4}
            onPress={() =>
              pinA.run(async () => {
                await act({ type: "setOwnerPin", teamId: pinTeam, pin: pin.trim() });
                setPin("");
                notify("Owner PIN saved");
              })
            }
          />
        </Card>
      )}
    </>
  );
}
