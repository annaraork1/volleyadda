import React, { useState } from "react";
import { useRouter } from "expo-router";
import { Btn, Card, ErrorText, Field, H1, Muted, Screen, notify, useAction } from "../../src/components/ui";
import { authForgot } from "../../src/api/client";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const { busy, error, run } = useAction();

  const submit = async () => {
    if (!email.includes("@")) return;
    await run(async () => {
      await authForgot(email.trim());
      notify("Check your inbox", "If that email has an account, we sent a reset link.");
      router.replace({ pathname: "/auth/check-email", params: { email: email.trim() } });
    });
  };

  return (
    <Screen>
      <H1>Forgot password</H1>
      <Muted>We’ll email a reset link. Open it, then use Reset password in the app if needed.</Muted>
      <Card>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          placeholder="you@example.com"
        />
        <ErrorText>{error}</ErrorText>
        <Btn title="Send reset link" onPress={submit} loading={busy} disabled={!email.includes("@")} />
        <Btn title="I have a reset token" variant="ghost" onPress={() => router.push("/auth/reset")} />
      </Card>
    </Screen>
  );
}