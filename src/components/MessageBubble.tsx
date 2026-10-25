import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";
import type { Message } from "../types";
import { userNameOf } from "../utils/chat";
import { formatClockTime, formatDuration, formatFileSize } from "../utils/format";
import { openExternalUrl } from "../utils/links";
import { AudioMessage } from "./AudioMessage";
import { LinkifiedText } from "./LinkifiedText";

type MessageBubbleProps = {
  message: Message;
  isMine: boolean;
  showSender?: boolean;
  onLongPress?: () => void;
};

export const MessageBubble = ({
  message,
  isMine,
  showSender = false,
  onLongPress,
}: MessageBubbleProps) => {
  const { colors } = useTheme();

  if (message.messageType === "system" || message.messageType === "call") {
    const isCall = message.messageType === "call";
    const callType = message.callInfo?.callType === "video" ? "Video" : "Voice";
    const status = message.callInfo?.status;
    const statusLabel =
      status === "missed"
        ? "Missed"
        : status === "declined"
          ? "Declined"
          : status === "cancelled"
            ? "Cancelled"
            : "";
    const duration = message.callInfo?.duration
      ? ` · ${formatDuration(message.callInfo.duration)}`
      : "";

    return (
      <View style={styles.systemWrap}>
        <View
          style={[
            styles.systemPill,
            { backgroundColor: colors.bubbleSystem },
          ]}
        >
          {isCall ? (
            <Ionicons
              name={callType === "Video" ? "videocam-outline" : "call-outline"}
              size={14}
              color={colors.textMuted}
            />
          ) : null}
          <Text style={[styles.systemText, { color: colors.textMuted }]}>
            {isCall
              ? `${statusLabel ? `${statusLabel} ` : ""}${callType.toLowerCase()} call${duration}`
              : message.text || "Chat updated"}
          </Text>
        </View>
      </View>
    );
  }

  const isDeleted = Boolean(message.isDeleted);
  const images = (message.files || []).filter((file) =>
    file.mimeType?.startsWith("image/")
  );
  const audio = (message.files || []).filter((file) =>
    file.mimeType?.startsWith("audio/")
  );
  const documents = (message.files || []).filter(
    (file) =>
      !file.mimeType?.startsWith("image/") &&
      !file.mimeType?.startsWith("audio/")
  );

  const replySender = message.replyTo
    ? userNameOf(message.replyTo.sender, "Message")
    : "";
  const replyText = message.replyTo?.isDeleted
    ? "This message was deleted"
    : message.replyTo?.text || "";

  return (
    <View
      style={[
        styles.row,
        isMine ? styles.rowMine : styles.rowTheirs,
      ]}
    >
      {showSender && !isMine ? (
        <Text style={[styles.sender, { color: colors.primary }]}>
          {userNameOf(message.sender, "Member")}
        </Text>
      ) : null}

      <Pressable
        onLongPress={onLongPress}
        delayLongPress={350}
        style={({ pressed }) => [
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleTheirs,
          {
            backgroundColor: isMine ? colors.bubbleMine : colors.bubbleTheirs,
            borderBottomRightRadius: isMine ? 6 : 18,
            borderBottomLeftRadius: isMine ? 18 : 6,
            opacity: pressed ? 0.94 : 1,
          },
        ]}
      >
        {message.replyTo ? (
          <View
            style={[
              styles.replyBox,
              {
                backgroundColor: isMine
                  ? "rgba(255,255,255,0.13)"
                  : colors.surfaceAlt,
                borderLeftColor: isMine ? "#FFFFFF" : colors.primary,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.replySender,
                { color: isMine ? "#FFFFFF" : colors.primary },
              ]}
            >
              {replySender || "Reply"}
            </Text>
            <Text
              numberOfLines={2}
              style={[
                styles.replyText,
                {
                  color: isMine
                    ? "rgba(255,255,255,0.8)"
                    : colors.textMuted,
                },
              ]}
            >
              {replyText}
            </Text>
          </View>
        ) : null}

        {images.length > 0 ? (
          <View style={styles.images}>
            {images.map((file, index) => (
              <Pressable
                key={`${file.url}-${index}`}
                onPress={() => openExternalUrl(file.url)}
              >
                <Image
                  source={{ uri: file.url }}
                  style={styles.image}
                  contentFit="cover"
                  transition={150}
                />
              </Pressable>
            ))}
          </View>
        ) : null}

        {audio.length > 0 ? (
          <View style={styles.attachmentList}>
            {audio.map((file, index) => (
              <AudioMessage
                key={`${file.url}-${index}`}
                file={file}
                isMine={isMine}
              />
            ))}
          </View>
        ) : null}

        {documents.length > 0 ? (
          <View style={styles.attachmentList}>
            {documents.map((file, index) => (
              <Pressable
                key={`${file.url}-${index}`}
                onPress={() => openExternalUrl(file.url)}
                style={[
                  styles.fileRow,
                  {
                    backgroundColor: isMine
                      ? "rgba(255,255,255,0.12)"
                      : colors.surfaceAlt,
                  },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={isMine ? "#FFFFFF" : colors.primary}
                />
                <View style={styles.fileInfo}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.fileName,
                      { color: isMine ? "#FFFFFF" : colors.text },
                    ]}
                  >
                    {file.name}
                  </Text>
                  <Text
                    style={[
                      styles.fileSize,
                      {
                        color: isMine
                          ? "rgba(255,255,255,0.7)"
                          : colors.textMuted,
                      },
                    ]}
                  >
                    {formatFileSize(file.size)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {isDeleted ? (
          <Text
            style={[
              styles.deletedText,
              {
                color: isMine
                  ? "rgba(255,255,255,0.72)"
                  : colors.textMuted,
              },
            ]}
          >
            This message was deleted
          </Text>
        ) : message.text ? (
          <LinkifiedText
            text={message.text}
            style={[
              styles.messageText,
              { color: isMine ? colors.bubbleMineText : colors.bubbleTheirsText },
            ]}
            linkStyle={{
              color: isMine ? "#FFFFFF" : colors.primary,
              textDecorationColor: isMine
                ? "rgba(255,255,255,0.7)"
                : colors.primary,
            }}
          />
        ) : null}

        <View style={styles.meta}>
          <Text
            style={[
              styles.metaText,
              {
                color: isMine
                  ? "rgba(255,255,255,0.66)"
                  : colors.textSoft,
              },
            ]}
          >
            {formatClockTime(message.createdAt)}
            {message.isEdited ? " · edited" : ""}
          </Text>

          {isMine ? (
            message.pending ? (
              <Ionicons
                name="time-outline"
                size={13}
                color="rgba(255,255,255,0.66)"
              />
            ) : message.failed ? (
              <Ionicons name="alert-circle" size={13} color={colors.danger} />
            ) : message.isRead ? (
              <Ionicons name="checkmark-done" size={15} color="#93C5FD" />
            ) : message.isDelivered ? (
              <Ionicons
                name="checkmark-done"
                size={15}
                color="rgba(255,255,255,0.7)"
              />
            ) : (
              <Ionicons
                name="checkmark"
                size={14}
                color="rgba(255,255,255,0.7)"
              />
            )
          ) : null}
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 14,
    marginVertical: 2,
  },
  rowMine: {
    alignItems: "flex-end",
  },
  rowTheirs: {
    alignItems: "flex-start",
  },
  sender: {
    fontSize: 11.5,
    fontWeight: "700",
    marginBottom: 4,
    marginLeft: 8,
  },
  bubble: {
    maxWidth: "84%",
    minWidth: 72,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bubbleMine: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  bubbleTheirs: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21.5,
  },
  deletedText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    fontSize: 10.5,
    fontWeight: "500",
  },
  replyBox: {
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginBottom: 7,
  },
  replySender: {
    fontSize: 11,
    fontWeight: "800",
  },
  replyText: {
    fontSize: 12,
    marginTop: 2,
  },
  images: {
    gap: 5,
    marginBottom: 6,
  },
  image: {
    width: 224,
    height: 166,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  attachmentList: {
    gap: 5,
    marginBottom: 6,
  },
  fileRow: {
    minHeight: 52,
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: 13,
    fontWeight: "600",
  },
  fileSize: {
    fontSize: 10.5,
    marginTop: 2,
  },
  systemWrap: {
    alignItems: "center",
    paddingHorizontal: 18,
    marginVertical: 8,
  },
  systemPill: {
    maxWidth: "88%",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  systemText: {
    fontSize: 11.5,
    fontWeight: "600",
    textAlign: "center",
  },
});
