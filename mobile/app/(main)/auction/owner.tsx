import React, { useState } from "react";
import { Btn, Card, Chips, ErrorText, Field, H2, Loading, Muted, Row, Screen, TeamLogo, useAction } from "../../../src/components/ui";
import { PlayerOnBlock, TeamPurses, money } from "../../../src/components/AuctionParts";
import { postAction } from "../../../src/api/client";
import { useAuction } from "../../../src/hooks/useAuction";
import { useAuth } from "../../../src/context/AuthContext";
import { stepForAmount, type AuctionSettings } from "../../../src/shared";
import { Text } from "react-native";
import { colors } from "../../../src/theme";

export default function AuctionOwner() {
  const { data, error, refresh, season } = useAuction(1000);
  const { isSignedIn } = useAuth();
  const [teamId, setTeamId] = useState<string>("");
  const [pin, setPin] = useState("");
  const [custom, setCustom] = useState("");
  const { busy, error: actErr, run } = useAction();

  if (!data) return <Screen>{error ? <ErrorText>{error}</ErrorText> : <Loading label="Loading auction…" />}</Screen>;

  const cur = data.auction.current;
  const high = cur?.highBid;
  const team = data.teams.find((t) => t.id === teamId);
  const st = teamId ? data.auction.teams[teamId] : undefined;
  const inc = data.settings.increments as AuctionSettings["increments"];
  const quick = !cur ? 0 : high ? high.amount + stepForAmount(high.amount, inc) : cur.openingBase;
  const canBid = !!cur && cur.revealed && (data.auction.status === "bidding" || data.auction.status === "revealed") && !!teamId && high?.teamId !== teamId;

  const bid = async (amount: number) => {
    if (!cur) return;
    await run(async () => {
      await postAction(
        {
          type: "auctionBid",
          teamId,
          amount,
          expect: { no: cur.no, highAmount: high?.amount ?? 0 },
          season: season ?? undefined,
        },
        { pin: pin.trim() || undefined },
      );
      setCustom("");
      await refresh();
    });
  };

  return (
    <Screen onRefresh={refresh}>
      <Card>
        <H2>Your team</H2>
        <Chips
          value={teamId}
          onChange={setTeamId}
          options={data.teams.map((t) => ({ value: t.id, label: t.short || t.name }))}
        />
        <Field
          label="Owner PIN"
          value={pin}
          onChangeText={setPin}
          secureTextEntry
          hint={
            isSignedIn
              ? "Leave empty if the organiser added your account as the team owner."
              : "Ask the organiser for your team's owner PIN."
          }
        />
        {team && st && (
          <Row gap={10}>
            <TeamLogo logo={team.logo} color={team.color} size={36} />
            <Text style={{ color: colors.text, flex: 1 }}>
              {team.name} · balance {money(st.balance)} · max bid {money(st.maxBid)}
            </Text>
          </Row>
        )}
      </Card>

      <PlayerOnBlock data={data} />

      {cur && (
        <Card>
          <Btn
            title={high ? `Bid ${money(quick)}` : `Open at ${money(quick)}`}
            onPress={() => bid(quick)}
            disabled={!canBid}
            loading={busy}
          />
          <Row gap={8}>
            <Field
              style={{ flex: 1 }}
              value={custom}
              onChangeText={setCustom}
              keyboardType="number-pad"
              placeholder="Custom amount"
            />
            <Btn
              title="Bid"
              variant="secondary"
              disabled={!canBid || !Number(custom)}
              onPress={() => bid(Number(custom))}
            />
          </Row>
          {!teamId && <Muted>Choose your team to bid.</Muted>}
          {teamId && high?.teamId === teamId && <Muted>You hold the highest bid.</Muted>}
          {cur && !cur.revealed && <Muted>Waiting for the auctioneer to reveal the player.</Muted>}
          <ErrorText>{actErr}</ErrorText>
        </Card>
      )}

      <H2>All teams</H2>
      <TeamPurses data={data} highlight={teamId} />
    </Screen>
  );
}
