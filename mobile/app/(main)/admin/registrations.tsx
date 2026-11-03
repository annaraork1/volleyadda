import React, { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Btn, Card, Empty, ErrorText, H2, Loading, Muted, Pill, Row, Screen, confirmDialog, errMsg, notify, useAction } from "../../../src/components/ui";
import { postAction } from "../../../src/api/client";
import { useLive } from "../../../src/context/LiveContext";
import type { RegistrationEntry } from "../../../src/shared";
import { colors } from "../../../src/theme";

const STATUS_COLOR: Record<string, string> = {
  pending: colors.warn,
  approved: colors.good,
  rejected: colors.bad,
  excluded: colors.muted,
};

export default function AdminRegistrations() {
  const { season, refresh } = useLive();
  const [entries, setEntries] = useState<RegistrationEntry[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const { busy, error, run } = useAction();

  const load = useCallback(async () => {
    try {
      const r = await postAction({ type: "listRegistrations", season: season ?? undefined });
      setEntries((r as any).entries as RegistrationEntry[]);
      setLoadErr(null);
    } catch (e) {
      setLoadErr(errMsg(e));
    }
  }, [season]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = (id: string, status: RegistrationEntry["status"]) =>
    run(async () => {
      await postAction({ type: "regUpdate", id, status, season: season ?? undefined });
      await load();
    });

  const lock = async () => {
    const ok = await confirmDialog(
      "Lock registration?",
      "Approved players get auction numbers and the tournament moves to the Auction stage.",
      "Lock",
    );
    if (!ok) return;
    await run(async () => {
      await postAction({ type: "lockRegistration", confirm: "LOCK", season: season ?? undefined });
      await refresh(true);
      notify("Registration locked");
      await load();
    });
  };

  return (
    <Screen onRefresh={load}>
      <ErrorText>{loadErr}</ErrorText>
      {!entries && !loadErr && <Loading />}
      {entries && (
        <>
          <Muted>
            {entries.length} sign-ups · {entries.filter((e) => e.status === "approved").length} approved
          </Muted>
          {entries.length === 0 && <Empty>No registrations yet.</Empty>}
          {entries.map((e) => (
            <Card key={e.id}>
              <Row style={{ justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>{e.name}</Text>
                  <Muted>
                    {e.skill} · {e.priv.tower} · {e.priv.phone}
                  </Muted>
                </View>
                <Pill text={e.status} color={STATUS_COLOR[e.status]} />
              </Row>
              <Row gap={8}>
                <Btn title="Approve" small disabled={busy || e.status === "approved"} onPress={() => setStatus(e.id, "approved")} />
                <Btn title="Reject" small variant="secondary" disabled={busy || e.status === "rejected"} onPress={() => setStatus(e.id, "rejected")} />
              </Row>
            </Card>
          ))}
          <ErrorText>{error}</ErrorText>
          <H2>Done reviewing?</H2>
          <Btn title="Lock registration & start auction stage" onPress={lock} loading={busy} />
        </>
      )}
    </Screen>
  );
}
