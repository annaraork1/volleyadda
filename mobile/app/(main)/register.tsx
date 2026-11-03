import React, { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useRouter } from "expo-router";
import {
  Btn,
  Card,
  Chips,
  ErrorText,
  Field,
  H1,
  H2,
  LiveGate,
  Muted,
  Screen,
  notify,
  useAction,
} from "../../src/components/ui";
import { registerPlayer } from "../../src/api/client";
import { useLive } from "../../src/context/LiveContext";
import { colors } from "../../src/theme";

export default function Register() {
  const router = useRouter();
  const { refresh, season } = useLive();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tower, setTower] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [skill, setSkill] = useState("Intermediate");
  const [available, setAvailable] = useState<"Yes" | "No">("Yes");
  const [consent, setConsent] = useState(false);
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const { busy, error, run } = useAction();

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      notify("Permission needed", "Allow photo access to add a picture.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const out = await manipulateAsync(res.assets[0].uri, [{ resize: { width: 360 } }], {
      compress: 0.6,
      format: SaveFormat.JPEG,
      base64: true,
    });
    if (out.base64) setPhoto(`data:image/jpeg;base64,${out.base64}`);
  };

  return (
    <Screen onRefresh={() => refresh(true)}>
      <LiveGate>
        {(state) => {
          const reg = state.config.registration;
          const stage = state.config.stage;
          const open = stage === "registration" && !!reg?.open;
          const skills = reg?.skillLevels?.length ? reg.skillLevels : ["Beginner", "Intermediate", "Advanced"];
          const ageNum = Number(age);
          const under = !!reg?.guardianConsentUnder && Number.isFinite(ageNum) && ageNum > 0 && ageNum < reg.guardianConsentUnder;

          if (done) {
            return (
              <>
                <H1>You are registered</H1>
                <Muted>{done}</Muted>
                <Btn title="Back to home" onPress={() => router.replace("/")} />
              </>
            );
          }
          if (!open) {
            return (
              <Card>
                <H2>Registration is closed</H2>
                <Muted>{state.config.tournament.name} is not accepting player registrations right now.</Muted>
              </Card>
            );
          }
          const submit = async () => {
            const r = await run(() =>
              registerPlayer({
                season: season ?? state.tournamentKey,
                name,
                phone,
                tower,
                age,
                email,
                skill,
                available,
                consent,
                photo,
                ...(under ? { guardianConsent, guardianName, guardianPhone } : {}),
              }),
            );
            if (r) setDone(r.message || "Thanks, the organisers will confirm your place.");
          };
          return (
            <>
              <H1>Join {state.config.tournament.short}</H1>
              <Muted>Register as a player for {state.config.tournament.name}.</Muted>
              <Card>
                <Field label="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
                <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <Field label="Tower / flat" value={tower} onChangeText={setTower} autoCapitalize="characters" />
                <Field label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" />
                <Field label="Email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" />
                <Text style={{ color: colors.muted, fontWeight: "600", fontSize: 13 }}>Skill level</Text>
                <Chips value={skill} onChange={setSkill} options={skills.map((x) => ({ value: x, label: x }))} />
                <Text style={{ color: colors.muted, fontWeight: "600", fontSize: 13 }}>Available on match days?</Text>
                <Chips
                  value={available}
                  onChange={setAvailable}
                  options={[
                    { value: "Yes", label: "Yes" },
                    { value: "No", label: "No" },
                  ]}
                />
                <Text style={{ color: colors.muted, fontWeight: "600", fontSize: 13 }}>
                  Photo{reg?.requirePhoto ? " (required)" : " (optional)"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  {photo ? <Image source={{ uri: photo }} style={{ width: 64, height: 64, borderRadius: 32 }} /> : null}
                  <Btn title={photo ? "Change photo" : "Add photo"} variant="secondary" small onPress={pickPhoto} />
                </View>
              </Card>

              {under && (
                <Card>
                  <H2>Guardian consent</H2>
                  <Muted>Players under {reg?.guardianConsentUnder} need a guardian to agree.</Muted>
                  <Field label="Guardian name" value={guardianName} onChangeText={setGuardianName} autoCapitalize="words" />
                  <Field label="Guardian phone" value={guardianPhone} onChangeText={setGuardianPhone} keyboardType="phone-pad" />
                  <Check on={guardianConsent} onPress={() => setGuardianConsent((v) => !v)} label="My guardian agrees" />
                </Card>
              )}

              <Card>
                <Muted>{reg?.consentText || "I agree to take part and to my details being used for this tournament."}</Muted>
                <Check on={consent} onPress={() => setConsent((v) => !v)} label="I agree" />
              </Card>
              <ErrorText>{error}</ErrorText>
              <Btn
                title="Register"
                onPress={submit}
                loading={busy}
                disabled={!name.trim() || !phone.trim() || !tower.trim() || !consent}
              />
            </>
          );
        }}
      </LiveGate>
    </Screen>
  );
}

function Check({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: on ? colors.accent : colors.border,
          backgroundColor: on ? colors.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {on ? <Text style={{ color: colors.onAccent, fontWeight: "900" }}>✓</Text> : null}
      </View>
      <Text style={{ color: colors.text, fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}
