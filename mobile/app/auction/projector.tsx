import React from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { ErrorText, Loading, Screen, TeamLogo } from "../../src/components/ui";
import { money } from "../../src/components/AuctionParts";
import { useAuction } from "../../src/hooks/useAuction";
import { colors } from "../../src/theme";
import { absoluteUrl } from "../../src/api/absoluteUrl";
import { Image } from "react-native";

/** Landscape-friendly full-screen player card for the auction room. */
export default function AuctionProjector() {
  const { data, error, refresh } = useAuction();
  const { width, height } = useWindowDimensions();
  if (!data) {
    return (
      <Screen>
        {error ? <ErrorText>{error}</ErrorText> : <Loading label="Loading…" />}
      </Screen>
    );
  }
  const cur = data.auction.current;
  const player = cur ? data.players.find((p) => p.no === cur.no) : null;
  const high = cur?.highBid;
  const team = high ? data.teams.find((t) => t.id === high.teamId) : null;

  return (
    <Screen onRefresh={refresh} scroll={false}>
      <ErrorText>{error}</ErrorText>
      <View style={{ flex: 1, minHeight: Math.max(height - 80, 320), justifyContent: "center", padding: 16 }}>
        {!player ? (
          <Text style={{ color: colors.muted, fontSize: 28, textAlign: "center" }}>Waiting for next player…</Text>
        ) : (
          <View style={{ flexDirection: width > height ? "row" : "column", gap: 24, alignItems: "center" }}>
            {player.photo ? (
              <Image
                source={{ uri: absoluteUrl(player.photo) }}
                style={{ width: Math.min(280, width * 0.4), height: Math.min(280, width * 0.4), borderRadius: 16 }}
              />
            ) : (
              <View
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: 16,
                  backgroundColor: colors.cardAlt,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: colors.muted, fontSize: 48 }}>#{player.no}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.muted, fontSize: 20 }}>#{player.no}</Text>
              <Text style={{ color: colors.text, fontSize: 42, fontWeight: "800" }}>{player.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 22, marginTop: 8 }}>{player.skill}</Text>
              {high && (
                <View style={{ marginTop: 24, flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <TeamLogo logo={team?.logo} color={team?.color} size={48} />
                  <View>
                    <Text style={{ color: colors.text, fontSize: 28, fontWeight: "700" }}>{money(high.amount)}</Text>
                    <Text style={{ color: colors.muted, fontSize: 18 }}>{team?.name || high.teamId}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}
