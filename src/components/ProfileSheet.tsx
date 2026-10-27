import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import type { Conversation, User } from "../types";
import { userIdOf } from "../utils/chat";
import { Avatar } from "./Avatar";

type ProfileSheetProps = {
  visible: boolean;
  conversation: Conversation | null;
  currentUserId?: string;
  onClose: () => void;
};

const formatLastSeen = (user: User) => {
  if (user.isOnline) return "Online now";
  if (!user.lastSeen) return "Offline";
  const date = new Date(user.lastSeen);
  if (Number.isNaN(date.getTime())) return "Offline";

  return `Last seen ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} at ${date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
};

const ProfileRow = ({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <View
        style={[styles.rowIcon, { backgroundColor: colors.surfaceAlt }]}
      >
        <Ionicons name={icon} size={17} color={colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.textSoft }]}>
          {label}
        </Text>
        <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
};

export const ProfileSheet = ({
  visible,
  conversation,
  currentUserId,
  onClose,
}: ProfileSheetProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (!conversation) {
    return null;
  }

  const participants = Array.isArray(conversation.participants)
    ? conversation.participants
    : [];

  const otherUser = participants.find(
    (participant) => userIdOf(participant) !== currentUserId
  );

  const isGroup = conversation.isGroup;
  const title = isGroup
    ? conversation.title
    : otherUser?.name || conversation.title;
  const avatarUri = isGroup ? conversation.avatar : otherUser?.profilePicture;
  const photoHidden =
    !isGroup && otherUser?.profilePhotoVisibility === "nobody";
  const bio = isGroup ? "" : otherUser?.bio || "";
  const username = isGroup ? "" : otherUser?.username || "";
  const online = isGroup ? false : Boolean(otherUser?.isOnline);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
        onPress={onClose}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.head}>
            <Text style={[styles.headTitle, { color: colors.textMuted }]}>
              {isGroup ? "Group info" : "Profile"}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            <View style={styles.identity}>
              <Avatar
                name={title}
                uri={photoHidden ? undefined : avatarUri}
                size={86}
                isGroup={isGroup}
                online={online}
                showOnline={!isGroup}
              />
              <Text style={[styles.name, { color: colors.text }]}>
                {title}
              </Text>
              <Text style={[styles.handle, { color: colors.textMuted }]}>
                {isGroup
                  ? `${conversation.memberCount || participants.length} ${
                      (conversation.memberCount || participants.length) === 1
                        ? "member"
                        : "members"
                    }`
                  : username
                    ? `@${username}`
                    : online
                      ? "Online"
                      : "Bubbles user"}
              </Text>

              {!isGroup ? (
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: colors.surfaceAlt },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: online
                          ? colors.success
                          : colors.textSoft,
                      },
                    ]}
                  />
                  <Text style={[styles.statusText, { color: colors.textMuted }]}>
                    {formatLastSeen(otherUser || { name: title })}
                  </Text>
                </View>
              ) : null}
            </View>

            {bio ? (
              <View
                style={[
                  styles.bioCard,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.bioLabel, { color: colors.textSoft }]}>
                  About
                </Text>
                <Text style={[styles.bio, { color: colors.text }]}>{bio}</Text>
              </View>
            ) : null}

            {!isGroup && otherUser?.email ? (
              <ProfileRow
                icon="mail-outline"
                label="Email"
                value={otherUser.email}
              />
            ) : null}

            {isGroup ? (
              <View style={styles.members}>
                <Text style={[styles.membersLabel, { color: colors.textSoft }]}>
                  Members
                </Text>

                {participants.map((participant) => {
                  const memberId = userIdOf(participant);
                  const memberPhotoHidden =
                    participant.profilePhotoVisibility === "nobody";

                  return (
                    <View key={memberId} style={styles.memberRow}>
                      <Avatar
                        name={participant.name}
                        uri={
                          memberPhotoHidden
                            ? undefined
                            : participant.profilePicture
                        }
                        size={40}
                        online={participant.isOnline}
                        showOnline
                      />
                      <View style={styles.memberText}>
                        <Text
                          numberOfLines={1}
                          style={[styles.memberName, { color: colors.text }]}
                        >
                          {participant.name}
                          {memberId === currentUserId ? " (you)" : ""}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.memberHandle,
                            { color: colors.textMuted },
                          ]}
                        >
                          {participant.username
                            ? `@${participant.username}`
                            : participant.isOnline
                              ? "Online"
                              : "Offline"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "82%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  headTitle: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  scroll: {
    paddingBottom: 8,
  },
  identity: {
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 14,
  },
  name: {
    marginTop: 12,
    fontSize: 21,
    fontWeight: "800",
    textAlign: "center",
  },
  handle: {
    marginTop: 3,
    fontSize: 13,
  },
  statusPill: {
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  bioCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  bioLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  bio: {
    marginTop: 5,
    fontSize: 13.5,
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rowValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "600",
  },
  members: {
    marginTop: 6,
  },
  membersLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  memberRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  memberText: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "700",
  },
  memberHandle: {
    marginTop: 2,
    fontSize: 11.5,
  },
});
