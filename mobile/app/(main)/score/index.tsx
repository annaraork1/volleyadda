import React, { useEffect, useState } from "react";
import { Btn, Card, Empty, Field, H2, LiveGate, Muted, Screen, MatchCard, Row } from "../../../src/components/ui";
import { useRouter } from "expo-router";
import { getPin, setPin } from "../../../src/api/client";
import { useAuth } from "../../../src/context/AuthContext";
import { useLive } from "../../../src/context/LiveContext";

export default function ScoreIndex() {
  const router = useRouter();
  const { isSignedIn, needsVerify } = useAuth();
  const { refresh } = useLive();
  const [pin, setPinState] = useState("");
  const [savedPin, setSavedPin] = useState(false);

  useEffect(() => {
    void getPin().then((p) => {
      if (p) {
        setPinState(p);
        setSavedPin(true);
      }
    });
  }, []);

  const savePin = async () => {
    await setPin(pin.trim() || null);
    setSavedPin(!!pin.trim());
  };

  return (
    <Screen onRefresh={() => refresh(true)}>
      {!isSignedIn && !savedPin && (
        <Card>
          <H2>Sign in to score</H2>
          <Muted>
            Select a tournament on Home first. Organisers and scorers can score after signing in, or enter a venue
            scorer PIN below.
          </Muted>
          <Row>
            <Btn title="Sign in" small onPress={() => router.push({ pathname: "/auth/login", params: { next: "/score" } })} />
            <Btn title="Sign up" small variant="secondary" onPress={() => router.push("/auth/signup")} />
          </Row>
        </Card>
      )}
      {isSignedIn && needsVerify && (
        <Card>
          <Muted>Your email is not verified yet, so the server will refuse score changes. Open the link we emailed you.</Muted>
        </Card>
      )}
      <Card>
        <Field
          label="Scorer PIN (optional)"
          value={pin}
          onChangeText={setPinState}
          secureTextEntry
          keyboardType="number-pad"
          hint="Only needed if the organiser gave you a PIN instead of adding your account."
        />
        <Btn title={savedPin ? "Update PIN" : "Save PIN"} variant="secondary" small onPress={savePin} />
      </Card>

      <LiveGate>
        {(state, calc) => {
          const fx = [...state.config.fixtures].sort((a, b) => a.no - b.no);
          if (!fx.length) {
            return (
              <Card>
                <H2>Generate fixtures first</H2>
                <Muted>Official scoring needs a schedule. Ask the organiser to generate fixtures, then come back here.</Muted>
                <Btn title="Organiser · fixtures" variant="secondary" onPress={() => router.push("/admin/fixtures")} />
              </Card>
            );
          }
          const open = fx
            .filter((f) => calc.ms[f.id].status !== "done")
            .sort((a, b) => {
              const order = { live: 0, scheduled: 1, done: 2 } as const;
              return order[calc.ms[a.id].status] - order[calc.ms[b.id].status] || a.no - b.no;
            });
          const finished = fx.filter((f) => calc.ms[f.id].status === "done");
          return (
            <>
              <H2>Open matches</H2>
              {open.length === 0 ? <Empty>No open matches.</Empty> : null}
              {open.map((f) => (
                <MatchCard key={f.id} fx={f} onPress={() => router.push(`/score/${f.id}`)} />
              ))}
              {finished.length > 0 && (
                <>
                  <H2>Finished</H2>
                  {finished.map((f) => (
                    <MatchCard key={f.id} fx={f} onPress={() => router.push(`/score/${f.id}`)} />
                  ))}
                </>
              )}
            </>
          );
        }}
      </LiveGate>
    </Screen>
  );
}
