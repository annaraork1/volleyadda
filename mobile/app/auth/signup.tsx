import React, { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Btn, Card, ErrorText, Field, H1, Muted, Screen, notify, useAction } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";

export default function Signup() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, run } = useAction();

  const valid = name.trim().length > 0 && email.includes("@") && password.length >= 8;

  const submit = async () => {
    if (!valid) return;
    const ok = await run(async () => {
      await signup(name, email, password);
      return true;
    });
    if (ok) {
      notify(
        "Account created",
        "We emailed you a verification link. Open it to unlock creating tournaments and scoring.",
      );
      if (next) router.replace(next as never);
      else router.replace("/");
    }
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
      </Card>
      <Btn
        title="I already have an account"
        variant="secondary"
        onPress={() => router.replace({ pathname: "/auth/login", params: next ? { next } : {} })}
      />
    </Screen>
  );
}
