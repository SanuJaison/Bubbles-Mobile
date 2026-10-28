import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";
import type { Conversation } from "../types";
import { conversationPreview } from "../utils/chat";
import { formatListTime } from "../utils/format";
import { Avatar } from "./Avatar";

const bubbleAI = require("../../assets/bubble-ai.png");

type ChatListItemProps = {
  conversation: Conversation;
  onPress: () => void;
  onLongPress?: () => void;
  isAI?: boolean;
  isPinned?: boolean;
  isFavorite?: boolean;
  isMuted?: boolean;
};

export const ChatListItem = ({
  conversation,
  onPress,
  onLongPress,
  isAI = false,
  isPinned = false,
  isFavorite = false,
  isMuted = false,
}: ChatListItemProps) => {
  const { colors } = useTheme();
  const hasUnread = conversation.unread > 0;
  const preview = conversation.typing
    ? "typing..."
    : conversationPreview(conversation);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.surfaceAlt : "transparent",
        },
      ]}
    >
      {isAI ? (
        <Image
          source={bubbleAI}
          style={styles.aiAvatar}
          contentFit="cover"
          transition={180}
        />
      ) : (
        <Avatar
          name={conversation.title}
          uri={conversation.avatar}
          size={52}
          isGroup={conversation.isGroup}
          online={conversation.online}
          showOnline={!conversation.isGroup}
        />
      )}

      <View style={styles.content}>
        <View style={styles.topLine}>
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              { color: colors.text, fontWeight: hasUnread ? "800" : "700" },
            ]}
          >
            {conversation.title}
          </Text>

          {isPinned ? (
            <Ionicons name="pin" size={13} color={colors.primary} />
          ) : null}

          {isFavorite ? (
            <Ionicons name="star" size={13} color={colors.accent} />
          ) : null}

          {isMuted ? (
            <Ionicons
              name="notifications-off-outline"
              size={14}
              color={colors.textSoft}
            />
          ) : null}

          <Text
            style={[
              styles.time,
              { color: hasUnread ? colors.primary : colors.textSoft },
            ]}
          >
            {formatListTime(conversation.lastMessageAt)}
          </Text>
        </View>

        <View style={styles.bottomLine}>
          <Text
            numberOfLines={1}
            style={[
              styles.preview,
              {
                color: conversation.typing
                  ? colors.primary
                  : hasUnread
                    ? colors.text
                    : colors.textMuted,
                fontWeight: hasUnread || conversation.typing ? "600" : "400",
              },
            ]}
          >
            {preview}
          </Text>

          {hasUnread ? (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>
                {conversation.unread > 99 ? "99+" : conversation.unread}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 11,
    gap: 13,
  },
  aiAvatar: {
    width: 52,
    height: 52,
    borderRadius: 17,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  topLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15.5,
  },
  time: {
    fontSize: 11,
    fontWeight: "600",
  },
  bottomLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  preview: {
    flex: 1,
    fontSize: 13,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "800",
  },
});
