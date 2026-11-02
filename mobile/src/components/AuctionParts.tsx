import React, { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { Card, Muted, Pill, Row, TeamLogo } from "./ui";
import { absoluteUrl } from "../api/absoluteUrl";
import { colors } from "../theme";
import type { AuctionPayload } from "../api/client";

export const money = (n: number | undefined | null) => (n == null ? "–" : n.toLocaleString("en-IN"));

export const STATUS_TEXT: Record<string, string> = {
  "not-started": "Not started",
  drawing: "Waiting for next player",
  revealed: "Player revealed",
  bidding: "Bidding open",
  paused: "Paused",
  "round-complete": "Round complete",
  complete: "Auction complete",
};

export function PlayerOnBlock({ data }: { data: AuctionPayload }) {
  const a = data.auction;
  const cur = a.current;
  const player = cur ? data.players.find((p) => p.no === cur.no) : undefined;
  const high = cur?.highBid;
  const highTeam = high ? data.teams.find((t) => t.id === high.teamId) : undefined;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!cur?.timerEndsAt) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [cur?.timerEndsAt]);
  const left = cur?.timerEndsAt ? Math.max(0, Math.ceil((cur.timerEndsAt - now) / 1000)) : null;

  return (
    <Card style={{ gap: 12 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Pill text={STATUS_TEXT[a.status] ?? a.status} color={a.status === "bidding" ? colors.live : colors.accent} />
        <Muted>Round {a.round} · pool {a.pool.length}</Muted>
      </Row>
      {cur && player ? (
        <>
          <Row gap={14}>
            {absoluteUrl(player.photo) && cur.revealed ? (
              <Image source={{ uri: absoluteUrl(player.photo)! }} style={{ width: 84, height: 84, borderRadius: 42 }} />
            ) : (
              <View
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 42,
                  backgroundColor: colors.cardAlt,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: colors.text, fontSize: 28, fontWeight: "900" }}>#{player.no}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>
                {cur.revealed ? player.name : `Player #${player.no}`}
              </Text>
              <Muted>
                #{player.no} · {cur.revealed ? player.skill : "hidden until revealed"}
              </Muted>
              <Muted>Base {money(cur.openingBase)}</Muted>
            </View>
          </Row>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
            <View>
              <Muted>{high ? "Highest bid" : "No bids yet"}</Muted>
              <Text style={{ color: colors.accent, fontSize: 34, fontWeight: "900" }}>
                {high ? money(high.amount) : "–"}
              </Text>
              {highTeam && (
                <Row>
                  <TeamLogo logo={highTeam.logo} color={highTeam.color} size={22} />
                  <Text style={{ color: colors.text, fontWeight: "700" }}>{highTeam.name}</Text>
                </Row>
              )}
            </View>
            {left !== null && (
              <Text style={{ color: left <= 5 ? colors.bad : colors.warn, fontSize: 36, fontWeight: "900" }}>{left}s</Text>
            )}
          </Row>
        </>
      ) : (
        <Muted>{STATUS_TEXT[a.status] ?? "Waiting…"}</Muted>
      )}
    </Card>
  );
}

export function TeamPurses({ data, highlight }: { data: AuctionPayload; highlight?: string }) {
  return (
    <Card>
      {data.teams.map((t) => {
        const st = data.auction.teams[t.id];
        return (
          <Row
            key={t.id}
            style={{
              justifyContent: "space-between",
              paddingVertical: 6,
              borderBottomColor: colors.border,
              borderBottomWidth: 0.5,
              opacity: highlight && highlight !== t.id ? 0.8 : 1,
            }}
          >
            <Row style={{ flex: 1 }}>
              <TeamLogo logo={t.logo} color={t.color} size={30} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: "700" }} numberOfLines={1}>
                  {t.name}
                </Text>
                <Muted>
                  {st?.bought ?? 0} bought{st && !st.eligible && st.reason ? ` · ${st.reason}` : ""}
                </Muted>
              </View>
            </Row>
            {data.settings.showPricesPublic !== false && (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: colors.good, fontWeight: "800" }}>{money(st?.balance)}</Text>
                <Muted>max {money(st?.maxBid)}</Muted>
              </View>
            )}
          </Row>
        );
      })}
    </Card>
  );
}
