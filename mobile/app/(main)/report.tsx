import React, { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Btn, Card, ErrorText, Field, H1, Muted, Screen, useAction } from "../../src/components/ui";
import { sendSupport } from "../../src/api/client";
import { useAuth } from "../../src/context/AuthContext";
import { useLive } from "../../src/context/LiveContext";

export default function Report() {
  const router = useRouter();
  const params = useLocalSearchParams<{ season?: string; match?: string; practice?: string }>();
  const { isSignedIn } = useAuth();
  const { state } = useLive();
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const { busy, error, run } = useAction();

  const submit = async () => {
    const r = await run(() =>
      sendSupport({
        message: message.trim(),
        tournamentKey: params.season || state?.tournamentKey || undefined,
        matchId: params.match || undefined,
        practiceId: params.practice || undefined,
      }),
    );
    if (r) setSent(true);
  };

  if (sent) {
    return (
      <Screen>
        <H1>Report sent</H1>
        <Muted>Thanks. The VolleyAdda team will look at it.</Muted>
        <Btn title="Back to home" onPress={() => router.replace("/")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <H1>Report a problem</H1>
      <Muted>Tell us what went wrong. You need to be signed in so we can follow up.</Muted>
      {!isSignedIn && (
        <Card>
          <Btn
            title="Sign in"
            onPress={() => router.push({ pathname: "/auth/login", params: { next: "/report" } })}
          />
        </Card>
      )}
      <Card>
        <Field
          label="What went wrong?"
          value={message}
          onChangeText={setMessage}
          multiline
          autoCapitalize="sentences"
          placeholder="Describe the problem (at least 5 characters)"
        />
        <ErrorText>{error}</ErrorText>
        <Btn title="Send report" onPress={submit} loading={busy} disabled={!isSignedIn || message.trim().length < 5} />
      </Card>
    </Screen>
  );
}
