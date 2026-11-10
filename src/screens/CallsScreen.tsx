import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Avatar } from "../components/Avatar";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Screen } from "../components/Screen";
import { useCall, type CallHistoryEntry } from "../context/CallContext";
import { useTheme } from "../theme";
import { formatListTime } from "../utils/format";

const statusLabel = (entry: CallHistoryEntry) => {
  if (entry.status === "missed") return "Missed";
  if (entry.status === "declined") return "Declined";
  if (entry.status === "cancelled") return "Cancelled";

  if (entry.duration > 0) {
    const minutes = Math.floor(entry.duration / 60);
    const seconds = (entry.duration % 60).toString().padStart(2, "0");
    return `Completed · ${minutes}:${seconds}`;
  }

  return "Completed";
};

const CallRow = ({
  entry,
  onCallBack,
}: {
  entry: CallHistoryEntry;
  onCallBack: () => void;
}) => {
  const { colors } = useTheme();
  const missed = entry.status === "missed";
  const declined = entry.status === "declined";

  return (
    <Pressable
      onPress={onCallBack}
      accessibilityLabel={`Call ${entry.remoteUser.name} back`}
      style={({ pressed }) => [
        styles.callRow,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Avatar
        name={entry.remoteUser.name}
        uri={entry.remoteUser.profilePicture}
        size={46}
      />

      <View style={styles.callText}>
        <Text
          numberOfLines={1}
          style={[
            styles.callTitle,
            { color: missed || declined ? colors.danger : colors.text },
          ]}
        >
          {entry.remoteUser.name}
        </Text>

        <View style={styles.callMeta}>
          <Ionicons
            name={entry.direction === "outgoing" ? "arrow-up" : "arrow-down"}
            size={12}
            color={missed || declined ? colors.danger : colors.textMuted}
          />
          <Text
            style={[
              styles.callCopy,
              { color: missed || declined ? colors.danger : colors.textMuted },
            ]}
          >
            {statusLabel(entry)}
          </Text>
          <Text style={[styles.callDot, { color: colors.textSoft }]}>·</Text>
          <Text style={[styles.callCopy, { color: colors.textMuted }]}>
            {formatListTime(entry.at)}
          </Text>
        </View>
      </View>

      <View
        style={[styles.callIcon, { backgroundColor: colors.primarySoft }]}
      >
        <Ionicons
          name={entry.type === "video" ? "videocam" : "call"}
          size={19}
          color={colors.primary}
        />
      </View>
    </Pressable>
  );
};

export default function CallsScreen() {
  const { colors } = useTheme();
  const { history, startCall, clearHistory, supported } = useCall();
  const [clearOpen, setClearOpen] = useState(false);

  const callBack = (entry: CallHistoryEntry) => {
    startCall({
      userId: entry.remoteUser.id,
      name: entry.remoteUser.name,
      username: entry.remoteUser.username,
      profilePicture: entry.remoteUser.profilePicture,
      chatId: entry.chatId,
      type: entry.type,
    }).catch(() => {});
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Calls</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Voice and video, without leaving the conversation
          </Text>
        </View>

        {history.length > 0 ? (
          <Pressable
            onPress={() => setClearOpen(true)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.clearButton,
              {
                backgroundColor: colors.surfaceAlt,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[styles.clearText, { color: colors.textMuted }]}>
              Clear
            </Text>
          </Pressable>
        ) : null}
      </View>

      {!supported ? (
        <View
          style={[
            styles.notice,
            {
              backgroundColor: colors.primarySoft,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.primary}
          />
          <Text style={[styles.noticeText, { color: colors.textMuted }]}>
            Calls need the installed Bubbles app. Expo Go does not include the
            calling engine.
          </Text>
        </View>
      ) : null}

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          history.length === 0 && styles.listEmpty,
        ]}
        renderItem={({ item }) => (
          <CallRow entry={item} onCallBack={() => callBack(item)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View
              style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}
            >
              <Ionicons
                name="call-outline"
                size={30}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No calls yet
            </Text>
            <Text style={[styles.emptyCopy, { color: colors.textMuted }]}>
              Start a voice or video call from any direct chat. Your recent
              calls will appear here.
            </Text>
          </View>
        }
      />

      <ConfirmDialog
        visible={clearOpen}
        title="Clear call history?"
        message="This only clears the list on this device. Calls in your chats stay where they are."
        confirmLabel="Clear"
        destructive
        onCancel={() => setClearOpen(false)}
        onConfirm={() => {
          clearHistory().catch(() => {});
          setClearOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
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
  clearButton: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  clearText: {
    fontSize: 12,
    fontWeight: "700",
  },
  notice: {
    marginHorizontal: 18,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  list: {
    paddingHorizontal: 18,
    paddingBottom: 24,
    gap: 9,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  callRow: {
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  callText: {
    flex: 1,
    minWidth: 0,
  },
  callTitle: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  callMeta: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  callCopy: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  callDot: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  callIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    paddingHorizontal: 34,
    gap: 9,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: "800",
  },
  emptyCopy: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
