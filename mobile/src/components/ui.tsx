import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { absoluteUrl } from "../api/absoluteUrl";
import { colors, radius, space } from "../theme";
import { useLive } from "../context/LiveContext";
import { scoreLine, type Fixture } from "../shared";

/* ---------------------------- helpers ---------------------------- */

export function confirmDialog(title: string, message: string, okLabel = "OK"): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(typeof window !== "undefined" ? window.confirm(`${title}\n\n${message}`) : false);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: okLabel, style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

export function notify(title: string, message?: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Run an async handler with busy + error state. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(errMsg(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, setError, run };
}

/* ---------------------------- layout ---------------------------- */

export function Screen({
  children,
  scroll = true,
  onRefresh,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  onRefresh?: () => Promise<unknown> | void;
  style?: StyleProp<ViewStyle>;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const doRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  if (!scroll) return <View style={[styles.screen, styles.pad, style]}>{children}</View>;
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.pad, { paddingBottom: 48, gap: space.md }, style]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.accent} /> : undefined
        }
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function H1({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h1, style]}>{children}</Text>;
}
export function H2({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h2, style]}>{children}</Text>;
}
export function Body({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}
export function Muted({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}
export function ErrorText({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

export function Row({
  children,
  style,
  gap = space.sm,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap }, style]}>{children}</View>;
}

export function SectionHeader({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.sectionHeader}>
      <H2>{title}</H2>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={10}>
          <Text style={styles.link}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

/* ---------------------------- inputs ---------------------------- */

export function Btn({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
  small,
}: {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const bg =
    variant === "primary"
      ? colors.accent
      : variant === "danger"
        ? colors.bad
        : variant === "secondary"
          ? colors.cardAlt
          : "transparent";
  const fg = variant === "primary" || variant === "danger" ? "#04101C" : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        small && { paddingVertical: 8, paddingHorizontal: 12 },
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        variant === "ghost" && { borderWidth: 1, borderColor: colors.border },
        variant === "secondary" && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.btnText, { color: fg }, small && { fontSize: 13 }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  style,
  ...rest
}: TextInputProps & { label?: string; hint?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        {...rest}
        style={[styles.input, rest.multiline && { minHeight: 100, textAlignVertical: "top" }]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chips<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            style={[styles.chip, on && { backgroundColor: colors.accent, borderColor: colors.accent }]}
          >
            <Text style={{ color: on ? "#04101C" : colors.text, fontWeight: "600" }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Pill({ text, color = colors.accent }: { text: string; color?: string }) {
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={{ color, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 }}>{text.toUpperCase()}</Text>
    </View>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={{ padding: 32, alignItems: "center", gap: 12 }}>
      <ActivityIndicator color={colors.accent} />
      <Muted>{label}</Muted>
    </View>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ padding: 24, alignItems: "center" }}>
      <Muted style={{ textAlign: "center" }}>{children}</Muted>
    </View>
  );
}

/** Shows load error from the live provider with a retry. */
export function LiveGate({ children }: { children: (s: NonNullable<ReturnType<typeof useLive>["state"]>, c: NonNullable<ReturnType<typeof useLive>["calc"]>) => React.ReactNode }) {
  const { state, calc, error, refresh } = useLive();
  if (!state || !calc) {
    return (
      <View style={{ gap: 12 }}>
        {error ? (
          <Card>
            <ErrorText>{error}</ErrorText>
            <Btn title="Retry" onPress={() => void refresh()} variant="secondary" />
          </Card>
        ) : (
          <Loading />
        )}
      </View>
    );
  }
  return <>{children(state, calc)}</>;
}

/* ---------------------------- tournament bits ---------------------------- */

export function TeamLogo({ logo, color, size = 36 }: { logo?: string | null; color?: string; size?: number }) {
  const uri = absoluteUrl(logo);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.cardAlt,
        borderWidth: 2,
        borderColor: color || colors.border,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {uri ? <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" /> : null}
    </View>
  );
}

export function statusColor(status: string): string {
  return status === "live" ? colors.live : status === "done" ? colors.good : colors.muted;
}

export function MatchCard({ fx, onPress }: { fx: Fixture; onPress?: () => void }) {
  const router = useRouter();
  const { calc, team } = useLive();
  if (!calc) return null;
  const m = calc.ms[fx.id];
  const r = calc.resolved[fx.id];
  if (!m || !r) return null;
  const a = team(r.a);
  const b = team(r.b);
  const cur = m.sets[m.cur];
  return (
    <Pressable onPress={onPress || (() => router.push(`/match/${fx.id}`))}>
      <Card style={{ gap: 10 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Muted>
            #{fx.no} · {fx.stage}
            {fx.time ? ` · ${fx.day ? fx.day + " " : ""}${fx.time}` : ""}
          </Muted>
          <Pill
            text={m.status === "live" ? "● Live" : m.status === "done" ? "Final" : "Upcoming"}
            color={statusColor(m.status)}
          />
        </Row>
        {[
          { t: a, label: r.labelA, sets: m.setsA, pts: cur?.a, win: m.winner === "A" },
          { t: b, label: r.labelB, sets: m.setsB, pts: cur?.b, win: m.winner === "B" },
        ].map((side, i) => (
          <Row key={i} style={{ justifyContent: "space-between" }}>
            <Row style={{ flex: 1 }}>
              <TeamLogo logo={side.t?.logo} color={side.t?.color} size={30} />
              <Text style={[styles.teamName, side.win && { color: colors.good }]} numberOfLines={1}>
                {side.t?.name ?? side.label}
              </Text>
            </Row>
            {m.status !== "scheduled" && (
              <Row gap={10}>
                <Text style={styles.sets}>{side.sets}</Text>
                {m.status === "live" && <Text style={styles.pts}>{side.pts ?? 0}</Text>}
              </Row>
            )}
          </Row>
        ))}
        {m.status !== "scheduled" && <Muted>{scoreLine(m)}</Muted>}
      </Card>
    </Pressable>
  );
}

export function StandingsTable({ compact }: { compact?: boolean }) {
  const { calc, team } = useLive();
  const router = useRouter();
  if (!calc) return null;
  const head = ["P", "W", "L", "Sets", "Pts"];
  return (
    <View>
      <View style={styles.trow}>
        <Text style={[styles.th, { flex: 1 }]}>Team</Text>
        {head.map((h) => (
          <Text key={h} style={[styles.th, styles.tcell]}>
            {h}
          </Text>
        ))}
      </View>
      {calc.table.slice(0, compact ? 5 : undefined).map((row, i) => {
        const t = team(row.team);
        return (
          <Pressable key={row.team} style={styles.trow} onPress={() => router.push(`/teams/${row.team}`)}>
            <Row style={{ flex: 1 }}>
              <Text style={[styles.td, { width: 18, color: colors.muted }]}>{i + 1}</Text>
              <TeamLogo logo={t?.logo} color={t?.color} size={24} />
              <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>
                {t?.short || t?.name || row.team}
              </Text>
            </Row>
            <Text style={[styles.td, styles.tcell]}>{row.played}</Text>
            <Text style={[styles.td, styles.tcell]}>{row.won}</Text>
            <Text style={[styles.td, styles.tcell]}>{row.lost}</Text>
            <Text style={[styles.td, styles.tcell]}>
              {row.setsWon}-{row.setsLost}
            </Text>
            <Text style={[styles.td, styles.tcell, { fontWeight: "800", color: colors.accent }]}>{row.points}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------------------------- styles ---------------------------- */

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: space.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
  },
  h1: { color: colors.text, fontSize: 26, fontWeight: "800" },
  h2: { color: colors.text, fontSize: 18, fontWeight: "700" },
  body: { color: colors.text, fontSize: 15, lineHeight: 21 },
  muted: { color: colors.muted, fontSize: 13 },
  error: { color: colors.bad, fontSize: 14 },
  link: { color: colors.accent, fontWeight: "600" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: space.sm },
  btn: {
    borderRadius: radius.sm,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontSize: 16, fontWeight: "700" },
  label: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  hint: { color: colors.muted, fontSize: 12 },
  input: {
    backgroundColor: colors.bg2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg2,
  },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  teamName: { color: colors.text, fontSize: 16, fontWeight: "600", flexShrink: 1 },
  sets: { color: colors.muted, fontSize: 20, fontWeight: "700", minWidth: 20, textAlign: "right" },
  pts: { color: colors.text, fontSize: 24, fontWeight: "800", minWidth: 32, textAlign: "right" },
  trow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  th: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  td: { color: colors.text, fontSize: 14 },
  tcell: { width: 44, textAlign: "center" },
});
