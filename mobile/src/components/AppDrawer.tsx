import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useLive } from "../context/LiveContext";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { colors, fonts, space } from "../theme";

type Item = { label: string; href: string; auth?: boolean; signedInOnly?: boolean };

/** Loose typing — expo-router and @react-navigation/drawer state types can diverge. */
type DrawerProps = {
  navigation: { closeDrawer: () => void };
  state?: unknown;
  descriptors?: unknown;
  [key: string]: unknown;
};

const WATCH: Item[] = [
  { label: "Live", href: "/" },
  { label: "Fixtures", href: "/fixtures" },
  { label: "Standings", href: "/standings" },
  { label: "Teams", href: "/teams" },
  { label: "Gallery", href: "/gallery" },
  { label: "Awards", href: "/awards" },
  { label: "Rules", href: "/rules" },
  { label: "Seasons", href: "/seasons" },
  { label: "Notifications", href: "/notices", signedInOnly: true },
];

const PLAY: Item[] = [
  { label: "Register", href: "/register" },
  { label: "Score", href: "/score", auth: true },
  { label: "Practice", href: "/practice" },
  { label: "Auction live", href: "/auction/live" },
];

const ORGANISE: Item[] = [
  { label: "Create tournament", href: "/tournament/create", auth: true },
  { label: "Organiser", href: "/admin", auth: true, signedInOnly: true },
];

function pathActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname === "/index";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppDrawer(props: DrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user, isSignedIn, logout } = useAuth();
  const { state } = useLive();
  const requireAuth = useRequireAuth();
  const short = state?.meta?.short || state?.config.tournament.short || "VolleyAdda";

  const go = (item: Item) => {
    props.navigation.closeDrawer();
    if (item.auth) requireAuth(item.href);
    else router.push(item.href as never);
  };

  const Section = ({ title, items }: { title: string; items: Item[] }) => {
    const visible = items.filter((i) => !i.signedInOnly || isSignedIn);
    if (!visible.length) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {visible.map((item) => {
          const on = pathActive(pathname, item.href);
          return (
            <Pressable
              key={item.href}
              onPress={() => go(item)}
              style={[styles.row, on && styles.rowOn]}
            >
              <Text style={[styles.rowLabel, on && styles.rowLabelOn]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ flexGrow: 1, paddingTop: 0 }}
      style={{ backgroundColor: colors.bg }}
    >
      <View style={[styles.brand, { paddingTop: Math.max(insets.top, 16) }]}>
        <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.brandName}>{short}</Text>
        <Text style={styles.brandSub}>VolleyAdda</Text>
      </View>

      <Section title="Watch" items={WATCH} />
      <Section title="Play" items={PLAY} />
      <Section title="Organise" items={ORGANISE} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {isSignedIn ? (
          <>
            <View style={styles.accountBox}>
              <Text style={styles.accountName} numberOfLines={1}>
                {user?.name}
              </Text>
              <Text style={styles.accountEmail} numberOfLines={1}>
                {user?.email}
              </Text>
            </View>
            <Pressable
              style={styles.row}
              onPress={() => {
                props.navigation.closeDrawer();
                void logout();
              }}
            >
              <Text style={styles.rowLabel}>Sign out</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              style={styles.row}
              onPress={() => {
                props.navigation.closeDrawer();
                router.push("/auth/login");
              }}
            >
              <Text style={styles.rowLabel}>Sign in</Text>
            </Pressable>
            <Pressable
              style={styles.row}
              onPress={() => {
                props.navigation.closeDrawer();
                router.push("/auth/signup");
              }}
            >
              <Text style={styles.rowLabel}>Create account</Text>
            </Pressable>
          </>
        )}
        <Pressable style={styles.row} onPress={() => go({ label: "Report", href: "/report" })}>
          <Text style={styles.rowLabel}>Report a problem</Text>
        </Pressable>
      </View>

      <View style={{ height: space.xl }} />
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  brand: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 4,
  },
  logo: { width: 48, height: 48, marginBottom: 6 },
  brandName: {
    color: colors.text,
    fontFamily: fonts.displayExtra,
    fontSize: 26,
    letterSpacing: 0.3,
  },
  brandSub: {
    color: colors.accent,
    fontFamily: fonts.displaySemi,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  section: { paddingTop: 14, paddingBottom: 4 },
  sectionTitle: {
    color: colors.muted,
    fontFamily: fonts.displaySemi,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  rowOn: {
    backgroundColor: colors.card,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  rowLabel: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 17,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  rowLabelOn: { color: colors.accent },
  accountBox: { paddingHorizontal: 20, paddingVertical: 8, gap: 2 },
  accountName: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 15 },
  accountEmail: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
});
