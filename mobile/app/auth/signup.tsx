import React, { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Btn, Card, ErrorText, Field, H1, Muted, Screen, useAction } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";

export default function Signup() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { signup, loginWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, run } = useAction();

  const valid = name.trim().length > 0 && email.includes("@") && password.length >= 8;

  const done = () => {
    if (next) router.replace(next as never);
    else router.replace("/");
  };

  const submit = async () => {
    if (!valid) return;
    const ok = await run(async () => {
      await signup(name, email, password);
      return true;
    });
    if (ok) {
      router.replace({
        pathname: "/auth/check-email",
        params: { email: email.trim(), ...(next ? { next } : {}) },
      });
    }
  };

  const google = async () => {
    const ok = await run(async () => {
      await loginWithGoogle();
      return true;
    });
    if (ok) done();
  };

  return (
    <Screen>
      <H1>Create your account</H1>
      <Muted>One account for scoring, tournaments and practice matches.</Muted>
      <Card>
        <Field
          label="Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
          placeholder="Your name"
        />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          placeholder="you@example.com"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          hint="At least 8 characters"
          onSubmitEditing={submit}
        />
        <ErrorText>{error}</ErrorText>
        <Btn title="Create account" onPress={submit} loading={busy} disabled={!valid} />
        <Btn title="Continue with Google" variant="secondary" onPress={google} loading={busy} disabled={busy} />
      </Card>
      <Btn
        title="I already have an account"
        variant="secondary"
        onPress={() => router.replace({ pathname: "/auth/login", params: next ? { next } : {} })}
      />
    </Screen>
  );
}
