import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";
import type { Message } from "../types";
import { userIdOf, userNameOf } from "../utils/chat";
import { formatInfoTime, messagePreview } from "../utils/format";

type MessageInfoDialogProps = {
  visible: boolean;
  message: Message | null;
  currentUserId?: string;
  readReceiptsEnabled?: boolean;
  onClose: () => void;
};

const Row = ({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted: boolean;
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text
        style={[styles.rowValue, { color: muted ? colors.textMuted : colors.text }]}
      >
        {value}
      </Text>
    </View>
  );
};

export const MessageInfoDialog = ({
  visible,
  message,
  currentUserId,
  readReceiptsEnabled = true,
  onClose,
}: MessageInfoDialogProps) => {
  const { colors } = useTheme();

  if (!message) return null;

  const mine = userIdOf(message.sender) === currentUserId;
  const senderName = userNameOf(message.sender, "Unknown");
  const preview = message.isDeleted
    ? "This message was deleted"
    : String(message.text || "").trim() || messagePreview(message) || "Attachment";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.head}>
            <Text style={[styles.title, { color: colors.text }]}>
              Message info
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View
              style={[
                styles.preview,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.previewText, { color: colors.text }]}>
                {preview}
              </Text>
            </View>

            <View style={styles.rows}>
              <Row
                label={mine ? "Sent" : "Received"}
                value={formatInfoTime(message.createdAt)}
                muted={false}
              />

              {!mine ? (
                <Row label="From" value={senderName} muted={false} />
              ) : null}

              {mine ? (
                <Row
                  label="Delivered"
                  value={
                    message.isDelivered
                      ? message.deliveredAt
                        ? formatInfoTime(message.deliveredAt)
                        : "Delivered"
                      : "Not delivered yet"
                  }
                  muted={!message.isDelivered}
                />
              ) : null}

              {mine ? (
                <Row
                  label="Read"
                  value={
                    !readReceiptsEnabled
                      ? "Read receipts turned off"
                      : message.isRead
                        ? message.readAt
                          ? formatInfoTime(message.readAt)
                          : "Read"
                        : "Not read yet"
                  }
                  muted={!readReceiptsEnabled || !message.isRead}
                />
              ) : null}

              {message.isEdited ? (
                <Row
                  label="Edited"
                  value={formatInfoTime(message.updatedAt || message.createdAt)}
                  muted={false}
                />
              ) : null}

              {message.isPinned ? (
                <Row
                  label={`Pinned by ${
                    userNameOf(message.pinnedBy, "") || "someone"
                  }`}
                  value={
                    message.pinnedAt ? formatInfoTime(message.pinnedAt) : "Yes"
                  }
                  muted={false}
                />
              ) : null}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
  },
  scroll: {
    marginTop: 14,
  },
  preview: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  rows: {
    marginTop: 14,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  rowLabel: {
    flex: 1,
    fontSize: 13,
  },
  rowValue: {
    flexShrink: 1,
    maxWidth: "62%",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
});
