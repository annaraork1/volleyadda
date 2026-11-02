import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Btn,
  Card,
  Empty,
  ErrorText,
  H1,
  H2,
  Muted,
  MatchCard,
  Pill,
  Row,
  Screen,
  SectionHeader,
  TeamLogo,
  confirmDialog,
  errMsg,
  notify,
} from "../src/components/ui";
import { listMyTournaments, listPublicTournaments, type TournamentListItem } from "../src/api/client";
import { useAuth } from "../src/context/AuthContext";
import { useLive } from "../src/context/LiveContext";
import { colors, radius } from "../src/theme";

const TILES: { label: string; href: string; icon: string }[] = [
  { label: "Fixtures", href: "/fixtures", icon: "📅" },
  { label: "Standings", href: "/standings", icon: "🏆" },
  { label: "Teams", href: "/teams", icon: "👥" },
  { label: "Rules", href: "/rules", icon: "📋" },
  { label: "Awards", href: "/awards", icon: "🥇" },
  { label: "Seasons", href: "/seasons", icon: "🗂" },
  { label: "Gallery", href: "/gallery", icon: "📷" },
  { label: "Register", href: "/register", icon: "✍️" },
  { label: "Score", href: "/score", icon: "🏐" },
  { label: "Auction", href: "/auction/board", icon: "🔨" },
];

export default function Home() {
  const router = useRouter();
  const { user, isSignedIn, ready, needsVerify, logout, deleteAccount, refresh: refreshAuth } = useAuth();
  const { state, calc, error, season, setSeason, refresh } = useLive();
  const [mine, setMine] = useState<TournamentListItem[]>([]);
  const [pub, setPub] = useState<TournamentListItem[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadErr(null);
    try {
      setPub(await listPublicTournaments());
    } catch (e) {
      setLoadErr(errMsg(e));
    }
    if (isSignedIn) {
      try {
        setMine(await listMyTournaments());
      } catch (e) {
        setLoadErr(errMsg(e));
      }
    } else setMine([]);
  }, [isSignedIn]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  const requireAuth = (href: string) => {
    if (isSignedIn) router.push(href as never);
    else router.push({ pathname: "/auth/login", params: { next: href } });
  };

  const pull = async () => {
    await Promise.all([load(), refresh(true), refreshAuth()]);
  };

  const onDelete = async () => {
    const ok = await confirmDialog(
      "Delete account?",
      "Your sign-in will be disabled. Tournaments you created stay available to other members. This cannot be undone.",
      "Delete",
    );
    if (!ok) return;
    try {
      await deleteAccount();
      notify("Account deleted");
    } catch (e) {
      notify("Could not delete", errMsg(e));
    }
  };

  const fixtures = state ? [...state.config.fixtures].sort((a, b) => a.no - b.no) : [];
  const live = calc ? fixtures.filter((f) => calc.ms[f.id]?.status === "live") : [];
  const next = calc ? fixtures.filter((f) => calc.ms[f.id]?.status === "scheduled").slice(0, 2) : [];
  const recent = calc ? fixtures.filter((f) => calc.ms[f.id]?.status === "done").slice(-2).reverse() : [];

  const openTournament = (key: string) => {
    setSeason(key);
  };

  return (
    <Screen onRefresh={pull}>
      <View style={{ gap: 4 }}>
        <H1>🏐 VolleyAdda</H1>
        <Muted>Live scores, tournaments and auctions for your volleyball community.</Muted>
      </View>

      <Row gap={10}>
        <Pressable style={[s.cta, { backgroundColor: colors.accent }]} onPress={() => router.push("/practice/new")}>
          <Text style={[s.ctaTitle, { color: "#04101C" }]}>Score one match</Text>
          <Text style={[s.ctaSub, { color: "#04293A" }]}>Quick friendly game</Text>
        </Pressable>
        <Pressable
          style={[s.cta, { backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border }]}
          onPress={() => requireAuth("/tournament/create")}
        >
          <Text style={s.ctaTitle}>Create tournament</Text>
          <Text style={s.ctaSub}>Teams, fixtures, table</Text>
        </Pressable>
      </Row>

      <Card>
        {!ready ? (
          <Muted>Checking sign-in…</Muted>
        ) : isSignedIn ? (
          <>
            <Row style={{ justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>{user?.name}</Text>
                <Muted>{user?.email}</Muted>
              </View>
              <Btn title="Sign out" variant="ghost" small onPress={() => void logout()} />
            </Row>
            {needsVerify && (
              <Text style={{ color: colors.warn, fontSize: 13 }}>
                Verify your email (check your inbox) to create tournaments and score official matches.
              </Text>
            )}
          </>
        ) : (
          <Row>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>Not signed in</Text>
              <Muted>Sign in to score and manage tournaments.</Muted>
            </View>
            <Btn title="Sign in" small onPress={() => router.push("/auth/login")} />
            <Btn title="Sign up" small variant="secondary" onPress={() => router.push("/auth/signup")} />
          </Row>
        )}
      </Card>

      <ErrorText>{error || loadErr}</ErrorText>

      {state && (
        <>
          <SectionHeader
            title="Current tournament"
            action={season ? { label: "Use default", onPress: () => setSeason(null) } : undefined}
          />
          <Card>
            <Row>
              <TeamLogo logo={state.meta.logo} size={44} />
              <View style={{ flex: 1 }}>
                <H2>{state.config.tournament.name}</H2>
                <Muted>
                  {[state.config.tournament.subtitle, state.config.tournament.dates].filter(Boolean).join(" · ")}
                </Muted>
              </View>
              <Pill text={state.config.stage || "matches"} />
            </Row>
          </Card>

          {live.map((f) => (
            <MatchCard key={f.id} fx={f} />
          ))}
          {!live.length && next[0] && <MatchCard fx={next[0]} />}
          {!live.length && recent[0] && <MatchCard fx={recent[0]} />}

          <View style={s.grid}>
            {TILES.map((t) => (
              <Pressable key={t.href} style={s.tile} onPress={() => router.push(t.href as never)}>
                <Text style={{ fontSize: 22 }}>{t.icon}</Text>
                <Text style={s.tileText}>{t.label}</Text>
              </Pressable>
            ))}
            {isSignedIn && (
              <Pressable style={s.tile} onPress={() => router.push("/admin")}>
                <Text style={{ fontSize: 22 }}>⚙️</Text>
                <Text style={s.tileText}>Organiser</Text>
              </Pressable>
            )}
          </View>
        </>
      )}

      {isSignedIn && (
        <>
          <SectionHeader title="My tournaments" />
          {mine.length === 0 ? (
            <Empty>You have no tournaments yet. Create one above.</Empty>
          ) : (
            mine.map((t) => <TournamentRow key={t.key} t={t} active={t.key === state?.tournamentKey} onOpen={openTournament} />)
          )}
        </>
      )}

      <SectionHeader title="Public tournaments" />
      {pub.length === 0 ? (
        <Empty>No public tournaments right now.</Empty>
      ) : (
        pub.map((t) => <TournamentRow key={t.key} t={t} active={t.key === state?.tournamentKey} onOpen={openTournament} />)
      )}

      <SectionHeader title="More" />
      <Card>
        <Btn title="Practice matches" variant="secondary" onPress={() => router.push("/practice")} />
        <Btn title="Report a problem" variant="secondary" onPress={() => router.push("/report")} />
        {isSignedIn && <Btn title="Delete my account" variant="ghost" onPress={onDelete} />}
      </Card>
    </Screen>
  );
}

function TournamentRow({
  t,
  active,
  onOpen,
}: {
  t: TournamentListItem;
  active: boolean;
  onOpen: (key: string) => void;
}) {
  return (
    <Pressable onPress={() => onOpen(t.key)}>
      <Card style={active ? { borderColor: colors.accent } : undefined}>
        <Row>
          <TeamLogo logo={t.logo} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>{t.name}</Text>
            <Muted>{[t.subtitle, t.dates].filter(Boolean).join(" · ") || t.key}</Muted>
          </View>
          {t.role ? <Pill text={String(t.role)} color={colors.warn} /> : null}
          <Pill text={active ? "Open" : String(t.stage)} color={active ? colors.accent : colors.muted} />
        </Row>
      </Card>
    </Pressable>
  );
}

const s = StyleSheet.create({
  cta: { flex: 1, borderRadius: radius.md, padding: 16, gap: 4, minHeight: 86, justifyContent: "center" },
  ctaTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  ctaSub: { color: colors.muted, fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "31%",
    flexGrow: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  tileText: { color: colors.text, fontSize: 13, fontWeight: "600" },
});
