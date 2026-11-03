import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Btn, Card, Empty, ErrorText, H1, Muted, Screen, errMsg } from "../../src/components/ui";
import { listNotices, markNoticesRead, type AppNotice } from "../../src/api/client";
import { useAuth } from "../../src/context/AuthContext";
import { colors } from "../../src/theme";

export default function Notices() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [notices, setNotices] = useState<AppNotice[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSignedIn) {
      setNotices([]);
      setUnread(0);
      return;
    }
    try {
      const r = await listNotices();
      setNotices(r.notices);
      setUnread(r.unread);
      setError(null);
    } catch (e) {
      setError(errMsg(e));
    }
  }, [isSignedIn]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!isSignedIn) {
    return (
      <Screen>
        <H1>Notifications</H1>
        <Muted>Sign in to see invites and live updates for tournaments you follow.</Muted>
        <Btn title="Sign in" onPress={() => router.push({ pathname: "/auth/login", params: { next: "/notices" } })} />
      </Screen>
    );
  }

  const openNotice = async (n: AppNotice) => {
    if (!n.read) {
      try {
        const r = await markNoticesRead(n.id);
        setNotices(r.notices);
        setUnread(r.unread);
      } catch {
        /* ignore */
      }
    }
    if (n.practiceId) router.push(`/practice/${n.practiceId}`);
    else if (n.tournamentKey && n.matchId) router.push(`/match/${n.matchId}`);
    else if (n.tournamentKey) router.push(`/tournament/${n.tournamentKey}`);
  };

  return (
    <Screen onRefresh={load}>
      <H1>Notifications</H1>
      <Muted>
        {unread > 0 ? `${unread} unread` : "Invites, practice live, and followed match live alerts."}
      </Muted>
      {unread > 0 && (
        <Btn
          title="Mark all read"
          variant="ghost"
          small
          onPress={() =>
            void markNoticesRead().then((r) => {
              setNotices(r.notices);
              setUnread(r.unread);
            })
          }
        />
      )}
      <ErrorText>{error}</ErrorText>
      {notices.length === 0 ? (
        <Empty>No notifications yet. Follow a public tournament or wait for an invite.</Empty>
      ) : (
        notices.map((n) => (
          <Pressable key={n.id} onPress={() => void openNotice(n)}>
            <Card style={{ opacity: n.read ? 0.75 : 1, borderColor: n.read ? undefined : colors.accent }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>{n.title}</Text>
              <Muted>{n.body}</Muted>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                <Muted>{n.type.replace(/_/g, " ")}</Muted>
                <Muted>{new Date(n.at).toLocaleString()}</Muted>
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
