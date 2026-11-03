import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Btn, Card, ErrorText, Field, H1, Muted, Screen, notify, useAction } from "../../src/components/ui";
import { authReset } from "../../src/api/client";
import { useAuth } from "../../src/context/AuthContext";

export default function ResetPassword() {
  const router = useRouter();
  const { token: tokenParam } = useLocalSearchParams<{ token?: string }>();
  const { refresh } = useAuth();
  const [token, setToken] = useState(typeof tokenParam === "string" ? tokenParam : "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { busy, error, run, setError } = useAction();

  useEffect(() => {
    if (typeof tokenParam === "string" && tokenParam) setToken(tokenParam);
  }, [tokenParam]);

  const submit = async () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    const ok = await run(async () => {
      await authReset(token.trim(), password);
      await refresh();
      return true;
    });
    if (ok) {
      notify("Password updated", "You’re signed in.");
      router.replace("/");
    }
  };

  return (
    <Screen>
      <H1>Reset password</H1>
      <Muted>Use the token from your reset email, then choose a new password.</Muted>
      <Card>
        <Field label="Reset token" value={token} onChangeText={setToken} autoCapitalize="none" placeholder="Token from email" />
        <Field
          label="New password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          hint="At least 8 characters"
        />
        <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry />
        <ErrorText>{error}</ErrorText>
        <Btn
          title="Update password"
          onPress={submit}
          loading={busy}
          disabled={!token.trim() || password.length < 8}
        />
      </Card>
    </Screen>
  );
}
