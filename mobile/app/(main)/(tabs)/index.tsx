import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Btn,
  Card,
  Empty,
  ErrorText,
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
} from "../../../src/components/ui";
import {
  getFollowing,
  listMyTournaments,
  listPublicTournaments,
  practiceList,
  setFollowing,
  type PracticeLiveBoardItem,
  type TournamentListItem,
} from "../../../src/api/client";
import { useAuth } from "../../../src/context/AuthContext";
import { useLive } from "../../../src/context/LiveContext";
import { useRequireAuth } from "../../../src/hooks/useRequireAuth";
import { colors, fonts, radius } from "../../../src/theme";

function roleLabel(role?: string | null) {
  if (!role) return null;
  if (role === "organiser") return "Organiser";
  if (role === "scorer") return "Scorer";
  if (role === "auctioneer") return "Auctioneer";
  if (role === "owner") return "Owner";
  return role;
}

export default function Home() {
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const { user, isSignedIn, ready, needsVerify, logout, deleteAccount, refresh: refreshAuth } = useAuth();
  const { state, calc, error, season, setSeason, refresh, seasonReady } = useLive();
  const [mine, setMine] = useState<TournamentListItem[]>([]);
  const [pub, setPub] = useState<TournamentListItem[]>([]);
  const [followingKeys, setFollowingKeys] = useState<string[]>([]);
  const [practiceLive, setPracticeLive] = useState<PracticeLiveBoardItem[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadErr(null);
    try {
      const [publicList, practice] = await Promise.all([listPublicTournaments(), practiceList()]);
      setPub(publicList);
      setPracticeLive(practice.live || []);
    } catch (e) {
      setLoadErr(errMsg(e));
    }
    if (isSignedIn) {
      try {
        const [myList, follow] = await Promise.all([listMyTournaments(), getFollowing()]);
        setMine(myList);
        setFollowingKeys(follow.keys || []);
      } catch (e) {
        setLoadErr(errMsg(e));
      }
    } else {
      setMine([]);
      setFollowingKeys([]);
    }
  }, [isSignedIn]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

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

  const created = useMemo(() => mine.filter((t) => t.role === "organiser"), [mine]);
  const hasTournaments = mine.length > 0;
  const showChooser = !hasTournaments;

  const fixtures = state ? [...state.config.fixtures].sort((a, b) => a.no - b.no) : [];
  const tournamentLive = calc ? fixtures.filter((f) => calc.ms[f.id]?.status === "live") : [];
  const next = calc ? fixtures.filter((f) => calc.ms[f.id]?.status === "scheduled").slice(0, 2) : [];
  const recent = calc ? fixtures.filter((f) => calc.ms[f.id]?.status === "done").slice(-2).reverse() : [];
  const anyLive = tournamentLive.length > 0 || practiceLive.length > 0;

  const openTournament = (key: string) => {
    setSeason(key);
    router.push(`/tournament/${key}`);
  };

  return (
    <Screen onRefresh={pull}>
      {(showChooser || !isSignedIn) && (
        <>
          <H2>Get started</H2>
          <Muted>
            {isSignedIn
              ? "Score a friendly practice match, or create a tournament to run fixtures and a table."
              : "Watch practice and public tournaments freely. Sign in to create a tournament or join as staff."}
          </Muted>
          <Row gap={10}>
            <Pressable style={[s.cta, s.ctaPrimary]} onPress={() => router.push("/practice/new")}>
              <Text style={[s.ctaTitle, { color: colors.onAccent }]}>Practice</Text>
              <Text style={[s.ctaSub, { color: colors.onAccent, opacity: 0.75 }]}>Score one friendly match</Text>
            </Pressable>
            <Pressable style={[s.cta, s.ctaSecondary]} onPress={() => requireAuth("/tournament/create")}>
              <Text style={s.ctaTitle}>Create tournament</Text>
              <Text style={s.ctaSub}>Teams, fixtures, table</Text>
            </Pressable>
          </Row>
        </>
      )}

      {hasTournaments && (
        <Row gap={10}>
          <Pressable style={[s.cta, s.ctaPrimary]} onPress={() => router.push("/practice/new")}>
            <Text style={[s.ctaTitle, { color: colors.onAccent }]}>Practice</Text>
            <Text style={[s.ctaSub, { color: colors.onAccent, opacity: 0.75 }]}>Friendly match</Text>
          </Pressable>
          <Pressable style={[s.cta, s.ctaSecondary]} onPress={() => requireAuth("/tournament/create")}>
            <Text style={s.ctaTitle}>New tournament</Text>
            <Text style={s.ctaSub}>Organise another event</Text>
          </Pressable>
        </Row>
      )}

      <Card>
        {!ready ? (
          <Muted>Checking sign-in…</Muted>
        ) : isSignedIn ? (
          <>
            <Row style={{ justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={s.accountName}>{user?.name}</Text>
                <Muted>{user?.email}</Muted>
              </View>
              <Btn title="Sign out" variant="ghost" small onPress={() => void logout()} />
            </Row>
            {needsVerify && (
              <Text style={s.warn}>
                Verify your email (check your inbox) to create tournaments and score official matches.
              </Text>
            )}
            <Btn title="Delete my account" variant="ghost" small onPress={onDelete} />
          </>
        ) : (
          <Row>
            <View style={{ flex: 1 }}>
              <Text style={s.accountName}>Not signed in</Text>
              <Muted>Sign in to create tournaments and score as staff.</Muted>
            </View>
            <Btn title="Sign in" small onPress={() => router.push("/auth/login")} />
            <Btn title="Sign up" small variant="secondary" onPress={() => router.push("/auth/signup")} />
          </Row>
        )}
      </Card>

      <ErrorText>{error || loadErr}</ErrorText>

      {(hasTournaments || practiceLive.length > 0) && (
        <>
          <SectionHeader title="Live" />
          {!anyLive && <Empty>Nothing live right now.</Empty>}
          {practiceLive.map(({ match: m, state: ms }) => (
            <Pressable key={m.id} onPress={() => router.push(`/practice/${m.id}`)}>
              <Card>
                <Row style={{ justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <Muted>Practice</Muted>
                    <Text style={s.accountName} numberOfLines={1}>
                      {m.labelA} vs {m.labelB}
                    </Text>
                    {ms?.status === "live" || ms?.status === "done" ? (
                      <Muted>
                        Sets {ms.setsA}–{ms.setsB}
                        {ms.sets[ms.cur] ? ` · ${ms.sets[ms.cur].a}–${ms.sets[ms.cur].b}` : ""}
                      </Muted>
                    ) : null}
                  </View>
                  <Pill text="● Live" color={colors.live} />
                </Row>
              </Card>
            </Pressable>
          ))}
          {tournamentLive.map((f) => (
            <MatchCard key={f.id} fx={f} />
          ))}
        </>
      )}

      {seasonReady && season && state && (
        <>
          <SectionHeader
            title="Selected tournament"
            action={{ label: "Clear", onPress: () => setSeason(null) }}
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
          {!tournamentLive.length && next[0] && (
            <>
              <SectionHeader title="Up next" />
              <MatchCard fx={next[0]} />
            </>
          )}
          {!tournamentLive.length && !next[0] && recent[0] && (
            <>
              <SectionHeader title="Recent" />
              <MatchCard fx={recent[0]} />
            </>
          )}
        </>
      )}

      {seasonReady && !season && hasTournaments && (
        <Card>
          <Muted>No tournament selected. Open one below to see fixtures, table and scoring.</Muted>
        </Card>
      )}

      {isSignedIn && created.length > 0 && (
        <>
          <SectionHeader title="Your tournaments" />
          <Muted>Quick pick — tournaments you organise</Muted>
          {created.map((t) => (
            <TournamentRow key={t.key} t={t} active={t.key === season} onOpen={openTournament} />
          ))}
        </>
      )}

      {isSignedIn && (
        <>
          <SectionHeader title="My tournaments" />
          {mine.length === 0 ? (
            <Empty>You have no tournaments yet. Create one above, or accept an invite.</Empty>
          ) : (
            mine.map((t) => (
              <TournamentRow key={`all-${t.key}`} t={t} active={t.key === season} onOpen={openTournament} />
            ))
          )}
        </>
      )}

      <SectionHeader title="Public tournaments" />
      {pub.length === 0 ? (
        <Empty>No public tournaments right now.</Empty>
      ) : (
        pub.map((t) => (
          <TournamentRow
            key={`pub-${t.key}`}
            t={t}
            active={t.key === season}
            onOpen={openTournament}
            following={followingKeys.includes(t.key)}
            onToggleFollow={
              isSignedIn
                ? async () => {
                    try {
                      const next = await setFollowing(t.key, !followingKeys.includes(t.key));
                      setFollowingKeys((prev) =>
                        next ? [...new Set([...prev, t.key])] : prev.filter((k) => k !== t.key),
                      );
                      notify(next ? "Following" : "Unfollowed");
                    } catch (e) {
                      notify("Could not update follow", errMsg(e));
                    }
                  }
                : () => requireAuth("/")
            }
          />
        ))
      )}
    </Screen>
  );
}

function TournamentRow({
  t,
  active,
  onOpen,
  following,
  onToggleFollow,
}: {
  t: TournamentListItem;
  active: boolean;
  onOpen: (key: string) => void;
  following?: boolean;
  onToggleFollow?: () => void;
}) {
  const label = roleLabel(t.role);
  return (
    <Pressable onPress={() => onOpen(t.key)}>
      <Card style={active ? { borderColor: colors.accent } : undefined}>
        <Row>
          <TeamLogo logo={t.logo} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={s.accountName}>{t.name}</Text>
            <Muted>{[t.subtitle, t.dates].filter(Boolean).join(" · ") || t.key}</Muted>
          </View>
          {label ? <Pill text={label} color={colors.warn} /> : null}
          <Pill text={active ? "Selected" : String(t.stage)} color={active ? colors.accent : colors.muted} />
        </Row>
        {onToggleFollow ? (
          <Btn
            title={following ? "Following" : "Follow"}
            variant={following ? "ghost" : "secondary"}
            small
            onPress={onToggleFollow}
          />
        ) : null}
      </Card>
    </Pressable>
  );
}

const s = StyleSheet.create({
  cta: { flex: 1, borderRadius: radius.lg, padding: 16, gap: 4, minHeight: 86, justifyContent: "center" },
  ctaPrimary: { backgroundColor: colors.accent },
  ctaSecondary: { backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border },
  ctaTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.bodyBold },
  ctaSub: { color: colors.muted, fontSize: 12, fontFamily: fonts.body },
  accountName: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  warn: { color: colors.live, fontSize: 13, fontFamily: fonts.body },
});
