import React from "react";
import { Image, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Btn, Card, Empty, ErrorText, H1, H2, LiveGate, Loading, Muted, Pill, Screen } from "../../../src/components/ui";
import { useAuction } from "../../../src/hooks/useAuction";
import { useLive } from "../../../src/context/LiveContext";
import { colors, fonts } from "../../../src/theme";

/** Public auction spectator view — no login. Never shows tower/age/phone. */
export default function AuctionLive() {
  const router = useRouter();
  const { state } = useLive();
  const { data, error } = useAuction(1000);

  return (
    <Screen>
      <LiveGate>
        {() => {
          if (error && !data) return <ErrorText>{error}</ErrorText>;
          if (!data?.auction || !data.settings) return <Loading label="Loading live auction…" />;

          const auction = data.auction;
          const teams = data.teams ?? [];
          const players = data.players ?? [];
          const teamMap = new Map(teams.map((t) => [t.id, t]));
          const playerMap = new Map(players.map((p) => [p.no, p]));
          const current = auction.current;
          const pl = current ? playerMap.get(current.no) : undefined;
          const high = current?.highBid;
          const highTeam = high ? teamMap.get(high.teamId) : undefined;
          const title =
            state?.meta?.name || state?.config.tournament.name || state?.tournamentKey || "Auction";

          const recentSold = Object.entries(auction.sold)
            .map(([no, s]) => ({ no: Number(no), ...s, name: playerMap.get(Number(no))?.name }))
            .sort((a, b) => b.round - a.round || b.no - a.no)
            .slice(0, 8);

          return (
            <>
              <Muted>Public · no login</Muted>
              <H1>{title}</H1>
              <Muted>
                Round {auction.round || "—"} · Sold {Object.keys(auction.sold).length}/{players.length}
              </Muted>
              <Pill
                text={String(auction.status)}
                color={auction.status === "complete" ? colors.good : colors.live}
              />

              <Card style={{ gap: 12 }}>
                {auction.status === "not-started" && <Muted>Auction hasn’t started yet.</Muted>}
                {auction.status === "complete" && <Muted>Auction complete.</Muted>}
                {auction.status === "round-complete" && (
                  <Muted>
                    Round {auction.round} done · {auction.unsold.length} unsold
                  </Muted>
                )}

                {current && (
                  <>
                    <Muted>On the block · #{String(current.no).padStart(2, "0")}</Muted>
                    {current.revealed && pl?.photo ? (
                      <Image
                        source={{ uri: pl.photo }}
                        style={{ width: 120, height: 120, borderRadius: 12, alignSelf: "center" }}
                      />
                    ) : null}
                    <Text
                      style={{
                        color: colors.text,
                        fontFamily: fonts.displayExtra,
                        fontSize: 28,
                        textAlign: "center",
                      }}
                    >
                      {current.revealed && pl ? pl.name : "Drawing…"}
                    </Text>
                    {current.revealed && pl ? <Muted>{pl.skill}</Muted> : null}
                    {current.revealed && (
                      <View
                        style={{
                          padding: 16,
                          borderRadius: 12,
                          backgroundColor: highTeam?.color ? highTeam.color + "33" : colors.cardAlt,
                          alignItems: "center",
                        }}
                      >
                        <Muted>Leading bid</Muted>
                        <Text style={{ color: colors.text, fontSize: 32, fontFamily: fonts.displayExtra }}>
                          {high ? `₹${high.amount}` : "—"}
                        </Text>
                        {highTeam ? <Muted>{highTeam.name}</Muted> : null}
                      </View>
                    )}
                  </>
                )}
              </Card>

              <H2>Recently sold</H2>
              {recentSold.length === 0 ? (
                <Empty>No sales yet.</Empty>
              ) : (
                recentSold.map((s) => (
                  <Card key={s.no}>
                    <Text style={{ color: colors.text, fontFamily: fonts.bodyBold }}>
                      #{String(s.no).padStart(2, "0")} {s.name || "Player"}
                    </Text>
                    <Muted>
                      ₹{s.amount} · {teamMap.get(s.teamId)?.name || s.teamId} · R{s.round}
                    </Muted>
                  </Card>
                ))
              )}

              <Btn title="Purse board" variant="secondary" onPress={() => router.push("/auction/board")} />
            </>
          );
        }}
      </LiveGate>
    </Screen>
  );
}
