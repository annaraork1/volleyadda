import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Btn, Card, ErrorText, Field, H1, Muted, Screen, notify, useAction } from "../../src/components/ui";
import { authVerify } from "../../src/api/client";
import { useAuth } from "../../src/context/AuthContext";

export default function VerifyEmail() {
  const router = useRouter();
  const { token: tokenParam, next } = useLocalSearchParams<{ token?: string; next?: string }>();
  const { refresh } = useAuth();
  const [token, setToken] = useState(typeof tokenParam === "string" ? tokenParam : "");
  const { busy, error, run } = useAction();

  useEffect(() => {
    if (typeof tokenParam === "string" && tokenParam) setToken(tokenParam);
  }, [tokenParam]);

  const submit = async () => {
    if (!token.trim()) return;
    const ok = await run(async () => {
      await authVerify(token.trim());
      await refresh();
      return true;
    });
    if (ok) {
      notify("Email verified", "You’re signed in.");
      if (next) router.replace(next as never);
      else router.replace("/");
    }
  };

  return (
    <Screen>
      <H1>Verify email</H1>
      <Muted>Paste the token from your verification email if the link opened the website instead of the app.</Muted>
      <Card>
        <Field label="Verify token" value={token} onChangeText={setToken} autoCapitalize="none" placeholder="Token from email" />
        <ErrorText>{error}</ErrorText>
        <Btn title="Verify" onPress={submit} loading={busy} disabled={!token.trim()} />
      </Card>
    </Screen>
  );
}
