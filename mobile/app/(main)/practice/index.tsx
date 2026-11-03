import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Btn, Card, Empty, ErrorText, H2, Loading, Muted, Pill, Row, Screen, errMsg } from "../../../src/components/ui";
import { practiceList, type PracticeListResult } from "../../../src/api/client";
import { colors } from "../../../src/theme";

export default function PracticeIndex() {
  const router = useRouter();
  const [data, setData] = useState<PracticeListResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await practiceList());
      setError(null);
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      const t = setInterval(() => void load(), 5000);
      return () => clearInterval(t);
    }, [load]),
  );

  return (
    <Screen onRefresh={load}>
      <Btn title="Score a new match" onPress={() => router.push("/practice/new")} />
      <ErrorText>{error}</ErrorText>
      {!data && !error && <Loading />}
      {data && (
        <>
          <H2>Live now</H2>
          {data.live.length === 0 ? (
            <Empty>No practice matches are live.</Empty>
          ) : (
            data.live.map(({ match: m, state }) => (
              <Pressable key={m.id} onPress={() => router.push(`/practice/${m.id}`)}>
                <Card>
                  <Row style={{ justifyContent: "space-between" }}>
                    <Text style={{ color: colors.text, fontWeight: "700", flex: 1 }} numberOfLines={1}>
                      {m.labelA} vs {m.labelB}
                    </Text>
                    <Pill
                      text={m.status === "live" ? "● Live" : "Draft"}
                      color={m.status === "live" ? colors.live : colors.muted}
                    />
                  </Row>
                  {state?.status === "live" || state?.status === "done" ? (
                    <Muted>
                      Sets {state.setsA}–{state.setsB}
                      {state.sets[state.cur]
                        ? ` · ${state.sets[state.cur].a}–${state.sets[state.cur].b}`
                        : ""}
                    </Muted>
                  ) : (
                    <Muted>Started {new Date(m.createdAt).toLocaleTimeString()}</Muted>
                  )}
                </Card>
              </Pressable>
            ))
          )}
          <H2>Recent results</H2>
          {data.matches.length === 0 ? (
            <Empty>No finished practice matches yet.</Empty>
          ) : (
            data.matches.map((m) => (
              <Pressable key={m.id} onPress={() => router.push(`/practice/${m.id}`)}>
                <Card>
                  {[
                    { l: m.labelA, s: m.setsWon.a, w: m.winner === "A" },
                    { l: m.labelB, s: m.setsWon.b, w: m.winner === "B" },
                  ].map((x, i) => (
                    <Row key={i} style={{ justifyContent: "space-between" }}>
                      <Text style={{ color: x.w ? colors.good : colors.text, fontSize: 16, fontWeight: "600" }}>{x.l}</Text>
                      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>{x.s}</Text>
                    </Row>
                  ))}
                  <View>
                    <Muted>
                      {m.setScores?.map((s) => `${s.a}–${s.b}`).join(", ")}
                      {m.setScores?.length ? " · " : ""}
                      {new Date(m.completedAt).toLocaleString()}
                    </Muted>
                  </View>
                </Card>
              </Pressable>
            ))
          )}
        </>
      )}
    </Screen>
  );
}
