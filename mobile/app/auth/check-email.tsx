import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Btn, Card, H1, Muted, Screen, notify, useAction } from "../../src/components/ui";
import { authForgot } from "../../src/api/client";

export default function CheckEmail() {
  const router = useRouter();
  const { email, next } = useLocalSearchParams<{ email?: string; next?: string }>();
  const { busy, run } = useAction();
  const addr = typeof email === "string" ? email : "";

  const resend = async () => {
    if (!addr.includes("@")) {
      notify("Missing email", "Go back and sign up again.");
      return;
    }
    await run(async () => {
      await authForgot(addr);
      notify("Email sent", "Check your inbox for the verification or reset link.");
    });
  };

  return (
    <Screen>
      <H1>Check your email</H1>
      <Muted>
        We sent a link{addr ? ` to ${addr}` : ""}. Open it on this phone to verify your account, then you can create
        tournaments and score.
      </Muted>
      <Card>
        <Muted>Didn’t get it? Check spam, or resend below. Links open the website — you can also paste the token here after verify/reset screens.</Muted>
        <Btn title="Resend email" variant="secondary" onPress={resend} loading={busy} disabled={!addr.includes("@")} />
        <Btn
          title="I verified — sign in"
          onPress={() => router.replace({ pathname: "/auth/login", params: next ? { next } : {} })}
        />
        <Btn title="Enter verify token" variant="ghost" onPress={() => router.push("/auth/verify")} />
      </Card>
    </Screen>
  );
}
