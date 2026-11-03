import React from "react";
import { Text, View } from "react-native";
import { Card, ErrorText, H2, Loading, Muted, Row, Screen, TeamLogo } from "../../../src/components/ui";
import { PlayerOnBlock, TeamPurses, money } from "../../../src/components/AuctionParts";
import { useAuction } from "../../../src/hooks/useAuction";
import { colors } from "../../../src/theme";

export default function AuctionBoard() {
  const { data, error, refresh } = useAuction();
  if (!data) {
    return (
      <Screen>
        {error ? <ErrorText>{error}</ErrorText> : <Loading label="Loading auction…" />}
      </Screen>
    );
  }
  const sold = Object.entries(data.auction.sold)
    .map(([no, s]) => ({ no: Number(no), ...s }))
    .reverse();
  return (
    <Screen onRefresh={refresh}>
      <ErrorText>{error}</ErrorText>
      <PlayerOnBlock data={data} />
      <H2>Teams</H2>
      <TeamPurses data={data} />
      <H2>Sold ({sold.length})</H2>
      {sold.length === 0 ? (
        <Muted>No players sold yet.</Muted>
      ) : (
        <Card>
          {sold.map((s) => {
            const p = data.players.find((x) => x.no === s.no);
            const t = data.teams.find((x) => x.id === s.teamId);
            return (
              <Row key={s.no} style={{ justifyContent: "space-between", paddingVertical: 4 }}>
                <Row style={{ flex: 1 }}>
                  <TeamLogo logo={t?.logo} color={t?.color} size={24} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "600" }} numberOfLines={1}>
                      #{s.no} {p?.name}
                    </Text>
                    <Muted>{t?.name}</Muted>
                  </View>
                </Row>
                {data.settings.showPricesPublic !== false && (
                  <Text style={{ color: colors.accent, fontWeight: "800" }}>{money(s.amount)}</Text>
                )}
              </Row>
            );
          })}
        </Card>
      )}
      {data.auction.unsold.length > 0 && <Muted>Unsold: {data.auction.unsold.map((n) => `#${n}`).join(", ")}</Muted>}
    </Screen>
  );
}
