import React, { useState } from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import {
  Btn,
  Card,
  Chips,
  ErrorText,
  Field,
  H2,
  Loading,
  Muted,
  Row,
  Screen,
  confirmDialog,
  useAction,
} from "../../src/components/ui";
import { PlayerOnBlock, TeamPurses, money } from "../../src/components/AuctionParts";
import { postAction } from "../../src/api/client";
import { useAuction } from "../../src/hooks/useAuction";
import { useAuth } from "../../src/context/AuthContext";
import { stepForAmount, type AuctionSettings } from "../../src/shared";
import { colors } from "../../src/theme";

export default function AuctionConsole() {
  const router = useRouter();
  const { data, error, refresh, season } = useAuction(1000);
  const { isSignedIn } = useAuth();
  const [teamId, setTeamId] = useState("");
  const [custom, setCustom] = useState("");
  const { busy, error: actErr, run } = useAction();

  if (!data) return <Screen>{error ? <ErrorText>{error}</ErrorText> : <Loading label="Loading auction…" />}</Screen>;

  const a = data.auction;
  const cur = a.current;
  const high = cur?.highBid;
  const inc = data.settings.increments as AuctionSettings["increments"];
  const quick = !cur ? 0 : high ? high.amount + stepForAmount(high.amount, inc) : cur.openingBase;

  const send = (type: string, extra: Record<string, unknown> = {}) =>
    run(async () => {
      await postAction({ type, season: season ?? undefined, ...extra });
      await refresh();
    });

  const bid = (amount: number) =>
    send("auctionBid", { teamId, amount, expect: { no: cur?.no ?? 0, highAmount: high?.amount ?? 0 } });

  const finish = async () => {
    if (await confirmDialog("Finish auction?", "Squads will be saved to the teams and the season moves to Fixtures.", "Finish")) {
      await send("auctionFinish");
    }
  };

  return (
    <Screen onRefresh={refresh}>
      {!isSignedIn && (
        <Card>
          <Muted>The console needs an organiser or auctioneer account (or a PIN saved on the Score screen).</Muted>
          <Btn title="Sign in" small onPress={() => router.push({ pathname: "/auth/login", params: { next: "/auction/console" } })} />
        </Card>
      )}
      <PlayerOnBlock data={data} />

      <Card>
        <H2>Auction controls</H2>
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          {a.status === "not-started" && <Btn title="Start auction" onPress={() => send("auctionStart")} loading={busy} />}
          {!cur && a.status === "drawing" && (
            <Btn title="Draw next player" onPress={() => send("auctionDraw")} loading={busy} />
          )}
          {cur && !cur.revealed && <Btn title="Reveal player" onPress={() => send("auctionReveal")} loading={busy} />}
          {cur && cur.revealed && high && <Btn title="SOLD" onPress={() => send("auctionSold")} loading={busy} />}
          {cur && cur.revealed && <Btn title="Unsold" variant="secondary" onPress={() => send("auctionUnsold")} loading={busy} />}
          {a.status === "round-complete" && (
            <Btn title="Next round" onPress={() => send("auctionNextRound")} loading={busy} />
          )}
          {a.status === "paused" ? (
            <Btn title="Resume" variant="secondary" onPress={() => send("auctionResume")} loading={busy} />
          ) : (
            a.status !== "not-started" &&
            a.status !== "complete" && <Btn title="Pause" variant="secondary" onPress={() => send("auctionPause")} loading={busy} />
          )}
          {a.status !== "not-started" && (
            <Btn title="Undo last" variant="ghost" onPress={() => send("auctionUndo")} loading={busy} />
          )}
          {a.status === "complete" && <Btn title="Finish & save squads" onPress={finish} loading={busy} />}
        </Row>
        <ErrorText>{actErr || error}</ErrorText>
      </Card>

      {cur && cur.revealed && (
        <Card>
          <H2>Take a bid</H2>
          <Muted>Choose the bidding team, then raise.</Muted>
          <Chips
            value={teamId}
            onChange={setTeamId}
            options={data.teams.map((t) => ({ value: t.id, label: t.short || t.name }))}
          />
          <Btn
            title={high ? `Raise to ${money(quick)}` : `Open at ${money(quick)}`}
            onPress={() => bid(quick)}
            disabled={!teamId || high?.teamId === teamId}
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
              disabled={!teamId || !Number(custom)}
              onPress={() => bid(Number(custom))}
            />
          </Row>
          {high && (
            <Text style={{ color: colors.muted }}>
              Bid history: {cur.bids.slice(-4).map((b) => `${data.teams.find((t) => t.id === b.teamId)?.short} ${money(b.amount)}`).join(" → ")}
            </Text>
          )}
        </Card>
      )}

      <H2>Teams</H2>
      <TeamPurses data={data} highlight={teamId} />
      <Muted>
        Sold {Object.keys(a.sold).length} · Unsold {a.unsold.length} · In pool {a.pool.length}
      </Muted>
    </Screen>
  );
}
