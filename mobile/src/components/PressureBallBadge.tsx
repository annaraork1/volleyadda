import React from "react";
import { Text, StyleSheet } from "react-native";
import { PRESSURE_BALL_LABEL, type PressureBall } from "../shared";
import { colors, fonts } from "../theme";

const TINT: Record<PressureBall, string> = {
  notice: colors.muted,
  opal: "#5b8def",
  game: colors.warn,
  match: colors.live,
};

export function PressureBallBadge({ kind }: { kind: PressureBall | null | undefined }) {
  if (!kind) return null;
  return (
    <Text style={[s.badge, { color: TINT[kind], borderColor: TINT[kind] }]} accessibilityLabel={PRESSURE_BALL_LABEL[kind]}>
      {PRESSURE_BALL_LABEL[kind]}
    </Text>
  );
}

const s = StyleSheet.create({
  badge: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.3,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
});
