import React, { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Btn, Card, ErrorText, Field, H1, Muted, Screen, notify, useAction } from "../../src/components/ui";
import { authForgot } from "../../src/api/client";
import { useAuth } from "../../src/context/AuthContext";

export default function Login() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, run } = useAction();

  const done = () => {
    if (next) router.replace(next as never);
    else if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const submit = async () => {
    if (!email.trim() || !password) return;
    const ok = await run(async () => {
      await login(email, password);
      return true;
    });
    if (ok) done();
  };

  const forgot = async () => {
    if (!email.includes("@")) {
      notify("Enter your email first", "Type your account email above, then tap “Forgot password”.");
      return;
    }
    await run(async () => {
      await authForgot(email.trim());
      notify("Check your inbox", "If that email has an account, we sent a reset link.");
    });
  };

  return (
    <Screen>
      <H1>Welcome back</H1>
      <Muted>Sign in to score matches, run tournaments and see your tournaments.</Muted>
      <Card>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          placeholder="you@example.com"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          onSubmitEditing={submit}
          placeholder="Your password"
        />
        <ErrorText>{error}</ErrorText>
        <Btn title="Sign in" onPress={submit} loading={busy} disabled={!email.trim() || !password} />
        <Btn title="Forgot password?" variant="ghost" onPress={forgot} disabled={busy} />
      </Card>
      <Btn
        title="Create an account"
        variant="secondary"
        onPress={() => router.replace({ pathname: "/auth/signup", params: next ? { next } : {} })}
      />
    </Screen>
  );
}
