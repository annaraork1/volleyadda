import React from "react";
import { View } from "react-native";
import { H2, LiveGate, MatchCard, Screen, Empty } from "../../../src/components/ui";
import { useLive } from "../../../src/context/LiveContext";

export default function Fixtures() {
  const { refresh } = useLive();
  return (
    <Screen onRefresh={() => refresh(true)}>
      <LiveGate>
        {(state) => {
          const fx = [...state.config.fixtures].sort((a, b) => a.no - b.no);
          if (!fx.length) return <Empty>No fixtures yet. The organiser can generate them from the Organiser screen.</Empty>;
          const groups = new Map<string, typeof fx>();
          for (const f of fx) {
            const k = f.day || f.date || "Matches";
            groups.set(k, [...(groups.get(k) || []), f]);
          }
          return (
            <>
              {[...groups.entries()].map(([day, list]) => (
                <View key={day} style={{ gap: 10 }}>
                  <H2>{day}</H2>
                  {list.map((f) => (
                    <MatchCard key={f.id} fx={f} />
                  ))}
                </View>
              ))}
            </>
          );
        }}
      </LiveGate>
    </Screen>
  );
}
