import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, Share, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import {
  Btn,
  Card,
  Empty,
  ErrorText,
  H1,
  H2,
  Loading,
  MatchCard,
  Muted,
  Pill,
  Row,
  Screen,
  StandingsTable,
  TeamLogo,
  errMsg,
  notify,
} from "../../../src/components/ui";
import { joinApiUrl } from "../../../src/api/absoluteUrl";
import { fetchState, getFollowing, setFollowing } from "../../../src/api/client";
import { useAuth } from "../../../src/context/AuthContext";
import { useLive } from "../../../src/context/LiveContext";
import { computeAll, type AppState } from "../../../src/shared";
import { colors, fonts } from "../../../src/theme";

type Tab = "live" | "fixtures" | "table" | "teams" | "gallery" | "organiser";

const TABS: { id: Tab; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "fixtures", label: "Fixtures" },
  { id: "table", label: "Table" },
  { id: "teams", label: "Teams" },
  { id: "gallery", label: "Gallery" },
  { id: "organiser", label: "Organiser" },
];

/** Public-style tournament hub with product tabs (PRODUCT.md Phase 4). */
export default function TournamentHub() {
  const { key: keyParam } = useLocalSearchParams<{ key: string }>();
  const key = String(keyParam || "");
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { season, setSeason } = useLive();
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("live");
  const [following, setFollowingState] = useState(false);
  const [canFollow, setCanFollow] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const load = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    try {
      const s = await fetchState({ season: key, fresh: true });
      setState(s);
      setError(null);
      if (season !== key) setSeason(key);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [key, season, setSeason]);

  const loadFollow = useCallback(async () => {
    if (!key || !isSignedIn) {
      setFollowingState(false);
      setCanFollow(false);
      return;
    }
    try {
      const r = await getFollowing(key);
      setFollowingState(!!r.following);
      setCanFollow(!!r.canFollow || !!r.following);
    } catch {
      setFollowingState(false);
      setCanFollow(false);
    }
  }, [key, isSignedIn]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadFollow();
  }, [loadFollow]);

  const toggleFollow = async () => {
    setFollowBusy(true);
    try {
      const next = await setFollowing(key, !following);
      setFollowingState(next);
      setCanFollow(true);
      notify(next ? "Following" : "Unfollowed", next ? "You'll get live match alerts." : undefined);
    } catch (e) {
      notify("Could not update follow", errMsg(e));
    } finally {
      setFollowBusy(false);
    }
  };

  const calc = useMemo(() => (state ? computeAll(state) : null), [state]);
  const webUrl = joinApiUrl(`/s/${key}`);
  const deepLink = Linking.createURL(`tournament/${key}`);
  const publicCode = state?.meta.publicCode;
  const qrUrl = useMemo(() => {
    const data = encodeURIComponent(webUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${data}`;
  }, [webUrl]);

  const shareAll = async () => {
    const lines = [
      state?.config.tournament.name || "VolleyAdda tournament",
      webUrl,
      publicCode ? `Code: ${publicCode}` : null,
      `App: ${deepLink}`,
    ].filter(Boolean);
    try {
      await Share.share({ message: lines.join("\n"), url: webUrl, title: state?.config.tournament.name });
    } catch {
      /* cancelled */
    }
  };

  if (loading && !state) {
    return (
      <Screen>
        <Loading label="Loading tournament…" />
      </Screen>
    );
  }

  if (error && !state) {
    return (
      <Screen>
        <ErrorText>{error}</ErrorText>
        <Btn title="Retry" onPress={load} />
        <Btn title="Home" variant="ghost" onPress={() => router.replace("/")} />
      </Screen>
    );
  }

  if (!state || !calc) return null;

  const t = state.config.tournament;
  const stage = state.config.stage || "matches";
  const showAuctionLive = stage === "auction" || stage === "registration";
  const fixtures = [...state.config.fixtures].sort((a, b) => a.no - b.no);
  const live = fixtures.filter((f) => calc.ms[f.id]?.status === "live");
  const upcoming = fixtures.filter((f) => calc.ms[f.id]?.status === "scheduled").slice(0, 6);
  const recent = fixtures.filter((f) => calc.ms[f.id]?.status === "done").slice(-4).reverse();

  return (
    <Screen
      onRefresh={async () => {
        await Promise.all([load(), loadFollow()]);
      }}
    >
      <Row gap={14}>
        <TeamLogo logo={state.meta.logo} size={64} />
        <View style={{ flex: 1 }}>
          <H1 style={{ fontSize: 22 }}>{t.name}</H1>
          <Muted>{[t.subtitle, t.dates].filter(Boolean).join(" · ")}</Muted>
          <Pill text={String(stage)} />
        </View>
      </Row>

      {isSignedIn && (canFollow || following) && (
        <Btn
          title={following ? "Following · tap to unfollow" : "Follow"}
          variant={following ? "secondary" : "primary"}
          small
          disabled={followBusy}
          onPress={() => void toggleFollow()}
        />
      )}
      {following && <Muted>You’ll get an in-app alert when a match goes live.</Muted>}
      {showAuctionLive && (
        <Btn title="Auction live" variant="secondary" small onPress={() => router.push("/auction/live")} />
      )}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {TABS.map((x) => (
          <Pressable
            key={x.id}
            onPress={() => setTab(x.id)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: tab === x.id ? colors.accent : colors.cardAlt,
              borderWidth: 1,
              borderColor: tab === x.id ? colors.accent : colors.border,
            }}
          >
            <Text style={{ color: tab === x.id ? colors.onAccent : colors.text, fontFamily: fonts.bodyBold, fontSize: 13 }}>
              {x.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "live" && (
        <>
          <H2>Live</H2>
          {live.length === 0 && upcoming.length === 0 && recent.length === 0 && (
            <Empty>No matches yet. Generate fixtures from Organiser when rosters are ready.</Empty>
          )}
          {live.map((f) => (
            <MatchCard key={f.id} fx={f} />
          ))}
          {upcoming.length > 0 && (
            <>
              <H2>Up next</H2>
              {upcoming.map((f) => (
                <MatchCard key={f.id} fx={f} />
              ))}
            </>
          )}
          {recent.length > 0 && live.length === 0 && (
            <>
              <H2>Recent</H2>
              {recent.map((f) => (
                <MatchCard key={f.id} fx={f} />
              ))}
            </>
          )}
          <Card style={{ gap: 10 }}>
            <H2>Share</H2>
            {publicCode ? (
              <Text style={{ color: colors.text, fontSize: 26, fontWeight: "800", letterSpacing: 3 }}>{publicCode}</Text>
            ) : null}
            <Muted>{webUrl}</Muted>
            <Image source={{ uri: qrUrl }} style={{ width: 140, height: 140, alignSelf: "center" }} />
            <Btn title="Share link & code" onPress={() => void shareAll()} />
          </Card>
        </>
      )}

      {tab === "fixtures" && (
        <>
          <H2>Fixtures</H2>
          {fixtures.length === 0 ? (
            <Empty>Generate fixtures first (teams + rosters required).</Empty>
          ) : (
            fixtures.map((f) => <MatchCard key={f.id} fx={f} />)
          )}
        </>
      )}

      {tab === "table" && (
        <>
          <H2>Table</H2>
          {fixtures.length === 0 ? (
            <Empty>Standings appear after league fixtures exist.</Empty>
          ) : (
            <Card>
              <StandingsTable />
            </Card>
          )}
        </>
      )}

      {tab === "teams" && (
        <>
          <H2>Teams</H2>
          {state.config.teams.length === 0 ? (
            <Empty>No teams yet. Add them from Organiser.</Empty>
          ) : (
            state.config.teams.map((tm) => (
              <Pressable key={tm.id} onPress={() => router.push(`/teams/${tm.id}`)}>
                <Card>
                  <Row>
                    <TeamLogo logo={tm.logo} color={tm.color} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: "700" }}>{tm.name}</Text>
                      <Muted>
                        {tm.short}
                        {Array.isArray(tm.squad) ? ` · ${tm.squad.length} players` : ""}
                      </Muted>
                    </View>
                  </Row>
                </Card>
              </Pressable>
            ))
          )}
        </>
      )}

      {tab === "gallery" && (
        <Card style={{ gap: 10 }}>
          <H2>Gallery</H2>
          <Muted>Photos can be added before the first match.</Muted>
          <Btn title="Open gallery" onPress={() => router.push("/gallery")} />
        </Card>
      )}

      {tab === "organiser" && (
        <Card style={{ gap: 8 }}>
          <H2>Organiser</H2>
          {!isSignedIn ? (
            <Muted>Sign in as the tournament organiser to manage stages, access and invites.</Muted>
          ) : (
            <Muted>Stages are skippable. Access holds venue PIN, fixture lock and staff invites.</Muted>
          )}
          <Btn title="Organiser home" onPress={() => router.push("/admin")} />
          <Btn title="Teams" variant="secondary" onPress={() => router.push("/admin/teams")} />
          <Btn title="Registrations" variant="secondary" onPress={() => router.push("/admin/registrations")} />
          <Btn title="Rules" variant="secondary" onPress={() => router.push("/admin/rules")} />
          <Btn title="Fixtures" variant="secondary" onPress={() => router.push("/admin/fixtures")} />
          <Btn title="Score matches" variant="ghost" onPress={() => router.push("/score")} />
        </Card>
      )}
    </Screen>
  );
}
