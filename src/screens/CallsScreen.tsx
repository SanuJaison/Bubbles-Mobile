import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { CALLS_COMING_SOON } from "../config";
import { useTheme } from "../theme";

const CallRow = ({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.callRow,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={[styles.callIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.callText}>
        <Text style={[styles.callTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.callCopy, { color: colors.textMuted }]}>
          {description}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: colors.surfaceAlt }]}>
        <Text style={[styles.badgeText, { color: colors.textSoft }]}>
          Soon
        </Text>
      </View>
    </View>
  );
};

export default function CallsScreen() {
  const { colors } = useTheme();

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Calls</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Voice and video, without leaving the conversation
        </Text>
      </View>

      <View
        style={[
          styles.hero,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.heroIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="call-outline" size={34} color={colors.primary} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.text }]}>
          {CALLS_COMING_SOON}
        </Text>
        <Text style={[styles.heroCopy, { color: colors.textMuted }]}>
          Your chats, groups, files, and Bubbles AI are ready now. Calls will
          arrive in a future Android update.
        </Text>
      </View>

      <View style={styles.list}>
        <CallRow
          icon="call-outline"
          title="Voice call"
          description="Start a one-to-one or group voice call."
        />
        <CallRow
          icon="videocam-outline"
          title="Video call"
          description="See the people you are talking to."
        />
      </View>

      <View style={styles.empty}>
        <Ionicons name="time-outline" size={22} color={colors.textSoft} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Recent calls will appear here once calling is available.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
  },
  title: {
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 18,
  },
  hero: {
    marginHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: "center",
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  heroCopy: {
    marginTop: 9,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
  },
  list: {
    marginTop: 18,
    paddingHorizontal: 18,
    gap: 10,
  },
  callRow: {
    minHeight: 74,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  callIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  callText: {
    flex: 1,
    minWidth: 0,
  },
  callTitle: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  callCopy: {
    marginTop: 3,
    fontSize: 11.5,
    lineHeight: 16,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  empty: {
    marginTop: "auto",
    marginBottom: 28,
    paddingHorizontal: 36,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: "center",
  },
});
