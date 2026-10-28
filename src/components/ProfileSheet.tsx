import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import type { Conversation, Message, User } from "../types";
import { formatFileSize } from "../utils/format";
import { userIdOf } from "../utils/chat";
import { openExternalUrl } from "../utils/links";
import { AudioMessage } from "./AudioMessage";
import { Avatar } from "./Avatar";

type ProfileSheetProps = {
  visible: boolean;
  conversation: Conversation | null;
  messages?: Message[];
  currentUserId?: string;
  isMuted?: boolean;
  isBlocked?: boolean;
  busy?: boolean;
  onClose: () => void;
  onToggleMute?: () => void;
  onToggleBlock?: () => void;
  onReport?: () => void;
  onClearChat?: () => void;
  onDeleteChat?: () => void;
  onSearchInChat?: () => void;
  onAddPeople?: () => void;
  onLeaveGroup?: () => void;
  onDeleteGroup?: () => void;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
};

type Tab = "media" | "voice" | "links" | "docs";

const LINK_PATTERN = /(https?:\/\/[^\s]+)/g;

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

const SectionTitle = ({ children }: { children: string }) => {
  const { colors } = useTheme();

  return (
    <Text style={[styles.sectionTitle, { color: colors.textSoft }]}>
      {children}
    </Text>
  );
};

const QuickAction = ({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled?: boolean;
  onPress?: () => void;
}) => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.quickAction,
        {
          backgroundColor: colors.primarySoft,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={21} color={colors.primary} />
      <Text
        numberOfLines={1}
        style={[styles.quickLabel, { color: colors.primary }]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const PanelRow = ({
  icon,
  label,
  hint,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  danger?: boolean;
  onPress?: () => void;
}) => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.panelRow,
        {
          backgroundColor: pressed ? colors.surfaceAlt : "transparent",
        },
      ]}
    >
      <View
        style={[
          styles.panelIcon,
          { backgroundColor: danger ? colors.accentSoft : colors.surfaceAlt },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={danger ? colors.danger : colors.primary}
        />
      </View>

      <View style={styles.panelText}>
        <Text
          style={[
            styles.panelLabel,
            { color: danger ? colors.danger : colors.text },
          ]}
        >
          {label}
        </Text>
        {hint ? (
          <Text style={[styles.panelHint, { color: colors.textMuted }]}>
            {hint}
          </Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={17} color={colors.textSoft} />
    </Pressable>
  );
};

export const ProfileSheet = ({
  visible,
  conversation,
  messages = [],
  currentUserId,
  isMuted = false,
  isBlocked = false,
  busy = false,
  onClose,
  onToggleMute,
  onToggleBlock,
  onReport,
  onClearChat,
  onDeleteChat,
  onSearchInChat,
  onAddPeople,
  onLeaveGroup,
  onDeleteGroup,
  onVoiceCall,
  onVideoCall,
}: ProfileSheetProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("media");

  const participants = conversation?.participants || [];
  const otherUser = participants.find(
    (participant) => userIdOf(participant) !== currentUserId
  );
  const isGroup = Boolean(conversation?.isGroup);
  const title = isGroup
    ? conversation?.title || "Group"
    : otherUser?.name || conversation?.title || "Unknown";
  const avatarUri = isGroup
    ? conversation?.avatar
    : otherUser?.profilePicture;
  const photoHidden =
    !isGroup && otherUser?.profilePhotoVisibility === "nobody";
  const bio = isGroup
    ? conversation?.groupDescription || ""
    : otherUser?.bio || "";
  const username = isGroup ? "" : otherUser?.username || "";
  const online = isGroup ? false : Boolean(otherUser?.isOnline);
  const memberCount = conversation?.memberCount || participants.length;

  const allFiles = useMemo(
    () =>
      messages.flatMap((message) =>
        (message.files || []).map((file) => ({
          ...file,
          messageId: message._id,
        }))
      ),
    [messages]
  );

  const mediaFiles = useMemo(
    () =>
      allFiles
        .filter((file) => file.mimeType?.startsWith("image/"))
        .reverse(),
    [allFiles]
  );

  const audioFiles = useMemo(
    () =>
      allFiles
        .filter((file) => file.mimeType?.startsWith("audio/"))
        .reverse(),
    [allFiles]
  );

  const docFiles = useMemo(
    () =>
      allFiles
        .filter(
          (file) =>
            !file.mimeType?.startsWith("image/") &&
            !file.mimeType?.startsWith("audio/") &&
            !file.mimeType?.startsWith("video/")
        )
        .reverse(),
    [allFiles]
  );

  const links = useMemo(() => {
    const found: string[] = [];

    messages.forEach((message) => {
      if (!message.text) return;
      message.text.match(LINK_PATTERN)?.forEach((url) => found.push(url));
    });

    return found.reverse();
  }, [messages]);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "media", label: "Media", count: mediaFiles.length },
    { id: "voice", label: "Voice", count: audioFiles.length },
    { id: "links", label: "Links", count: links.length },
    { id: "docs", label: "Docs", count: docFiles.length },
  ];

  const isCreator = Boolean(
    isGroup &&
      conversation?.groupCreatedBy &&
      String(conversation.groupCreatedBy) === currentUserId
  );

  const isAdmin = Boolean(
    isGroup &&
      ((conversation?.groupAdmins || []).some(
        (adminId) => String(adminId) === currentUserId
      ) ||
        isCreator)
  );

  const canAddMembers =
    !isGroup ||
    conversation?.groupPermissions?.addMembers !== "admins" ||
    isAdmin;

  if (!conversation) {
    return null;
  }

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
              paddingBottom: Math.max(insets.bottom, 14),
            },
          ]}
        >
          <View style={styles.head}>
            <Text style={[styles.headTitle, { color: colors.textMuted }]}>
              {isGroup ? "Group info" : "User info"}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.identity}>
              <Avatar
                name={title}
                uri={photoHidden ? undefined : avatarUri}
                size={92}
                isGroup={isGroup}
                online={online}
                showOnline={!isGroup}
              />
              <Text style={[styles.name, { color: colors.text }]}>{title}</Text>

              <Text style={[styles.handle, { color: colors.textMuted }]}>
                {isGroup
                  ? `${memberCount} ${memberCount === 1 ? "member" : "members"}`
                  : username
                    ? `@${username}`
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
              ) : isCreator ? (
                <View
                  style={[
                    styles.rolePill,
                    { backgroundColor: colors.primarySoft },
                  ]}
                >
                  <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
                  <Text style={[styles.roleText, { color: colors.primary }]}>
                    You created this group
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.quickRow}>
              <QuickAction
                icon="call-outline"
                label="Voice"
                disabled={isBlocked}
                onPress={onVoiceCall}
              />
              <QuickAction
                icon="videocam-outline"
                label="Video"
                disabled={isBlocked}
                onPress={onVideoCall}
              />
              <QuickAction
                icon="search-outline"
                label="Search"
                onPress={onSearchInChat}
              />
              <QuickAction
                icon="person-add-outline"
                label={isGroup ? "Add" : "To group"}
                disabled={isBlocked || !canAddMembers}
                onPress={onAddPeople}
              />
            </View>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <SectionTitle>About</SectionTitle>
              <Text style={[styles.bio, { color: colors.text }]}>
                {bio || "No bio yet."}
              </Text>
            </View>

            {!isGroup && otherUser?.email ? (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={17} color={colors.primary} />
                <Text
                  numberOfLines={1}
                  style={[styles.infoValue, { color: colors.text }]}
                >
                  {otherUser.email}
                </Text>
              </View>
            ) : null}

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <SectionTitle>Media, links & docs</SectionTitle>

              <View
                style={[
                  styles.tabs,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                {tabs.map((item) => {
                  const active = tab === item.id;

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setTab(item.id)}
                      style={[
                        styles.tab,
                        active && { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.tabText,
                          { color: active ? "#FFFFFF" : colors.textMuted },
                        ]}
                      >
                        {item.label} ({item.count})
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.tabBody}>
                {tab === "media" ? (
                  mediaFiles.length === 0 ? (
                    <Text style={[styles.emptyTab, { color: colors.textMuted }]}>
                      No media shared yet.
                    </Text>
                  ) : (
                    <View style={styles.mediaGrid}>
                      {mediaFiles.slice(0, 12).map((file, index) => (
                        <Pressable
                          key={`${file.url}-${index}`}
                          onPress={() => openExternalUrl(file.url)}
                          style={styles.mediaCell}
                        >
                          <Image
                            source={{ uri: file.url }}
                            style={styles.mediaImage}
                            contentFit="cover"
                            transition={140}
                          />
                        </Pressable>
                      ))}
                    </View>
                  )
                ) : null}

                {tab === "voice" ? (
                  audioFiles.length === 0 ? (
                    <Text style={[styles.emptyTab, { color: colors.textMuted }]}>
                      No voice messages yet.
                    </Text>
                  ) : (
                    <View style={styles.audioList}>
                      {audioFiles.slice(0, 8).map((file, index) => (
                        <AudioMessage
                          key={`${file.url}-${index}`}
                          file={file}
                          isMine={false}
                        />
                      ))}
                    </View>
                  )
                ) : null}

                {tab === "links" ? (
                  links.length === 0 ? (
                    <Text style={[styles.emptyTab, { color: colors.textMuted }]}>
                      No links shared yet.
                    </Text>
                  ) : (
                    <View style={styles.linkList}>
                      {links.slice(0, 12).map((url, index) => (
                        <Pressable
                          key={`${url}-${index}`}
                          onPress={() => openExternalUrl(url)}
                          style={({ pressed }) => [
                            styles.linkRow,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                              opacity: pressed ? 0.7 : 1,
                            },
                          ]}
                        >
                          <Ionicons
                            name="link-outline"
                            size={17}
                            color={colors.primary}
                          />
                          <Text
                            numberOfLines={1}
                            style={[styles.linkText, { color: colors.text }]}
                          >
                            {url}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )
                ) : null}

                {tab === "docs" ? (
                  docFiles.length === 0 ? (
                    <Text style={[styles.emptyTab, { color: colors.textMuted }]}>
                      No documents shared yet.
                    </Text>
                  ) : (
                    <View style={styles.linkList}>
                      {docFiles.slice(0, 12).map((file, index) => (
                        <Pressable
                          key={`${file.url}-${index}`}
                          onPress={() => openExternalUrl(file.url)}
                          style={({ pressed }) => [
                            styles.linkRow,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                              opacity: pressed ? 0.7 : 1,
                            },
                          ]}
                        >
                          <Ionicons
                            name="document-text-outline"
                            size={17}
                            color={colors.primary}
                          />
                          <View style={styles.docText}>
                            <Text
                              numberOfLines={1}
                              style={[styles.linkText, { color: colors.text }]}
                            >
                              {file.name}
                            </Text>
                            <Text
                              style={[
                                styles.docSize,
                                { color: colors.textMuted },
                              ]}
                            >
                              {formatFileSize(file.size)}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  )
                ) : null}
              </View>
            </View>

            {isGroup ? (
              <View style={styles.members}>
                <View style={styles.membersHead}>
                  <SectionTitle>{`Members (${memberCount})`}</SectionTitle>
                  {canAddMembers ? (
                    <Pressable onPress={onAddPeople} hitSlop={8}>
                      <Text style={[styles.addMembers, { color: colors.primary }]}>
                        Add members
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {participants.map((participant) => {
                  const memberId = userIdOf(participant);
                  const creator =
                    String(conversation.groupCreatedBy || "") === memberId;
                  const admin =
                    creator ||
                    (conversation.groupAdmins || []).some(
                      (adminId) => String(adminId) === memberId
                    );

                  return (
                    <View key={memberId} style={styles.memberRow}>
                      <Avatar
                        name={participant.name}
                        uri={
                          participant.profilePhotoVisibility === "nobody"
                            ? undefined
                            : participant.profilePicture
                        }
                        size={42}
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
                      {admin ? (
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: colors.primarySoft },
                          ]}
                        >
                          <Text
                            style={[styles.badgeText, { color: colors.primary }]}
                          >
                            {creator ? "Creator" : "Admin"}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.actions}>
              <PanelRow
                icon={isMuted ? "notifications-off-outline" : "notifications-outline"}
                label={
                  isMuted ? "Unmute notifications" : "Mute notifications"
                }
                onPress={onToggleMute}
              />

              <PanelRow
                icon="search-outline"
                label="Search in chat"
                onPress={onSearchInChat}
              />

              {canAddMembers ? (
                <PanelRow
                  icon="person-add-outline"
                  label={isGroup ? "Add members" : "Add to group"}
                  onPress={onAddPeople}
                />
              ) : null}

              {!isGroup ? (
                <PanelRow
                  icon={isBlocked ? "lock-open-outline" : "ban-outline"}
                  label={isBlocked ? "Unblock user" : "Block user"}
                  hint={
                    isBlocked
                      ? "They can message you again once unblocked"
                      : "You will stop receiving their messages"
                  }
                  danger={!isBlocked}
                  onPress={onToggleBlock}
                />
              ) : null}

              {!isCreator ? (
                <PanelRow
                  icon="flag-outline"
                  label={isGroup ? "Report group" : "Report user"}
                  onPress={onReport}
                />
              ) : null}

              <PanelRow
                icon="sparkles-outline"
                label="Clear chat"
                hint="Removes messages from your view"
                onPress={onClearChat}
              />

              {isGroup && !isCreator ? (
                <PanelRow
                  icon="log-out-outline"
                  label="Exit group"
                  danger
                  onPress={onLeaveGroup}
                />
              ) : null}

              {isGroup && isCreator ? (
                <PanelRow
                  icon="trash-outline"
                  label="Delete group"
                  hint="Deletes the group for everyone"
                  danger
                  onPress={onDeleteGroup}
                />
              ) : null}

              {!isGroup ? (
                <PanelRow
                  icon="trash-outline"
                  label="Delete chat"
                  danger
                  onPress={onDeleteChat}
                />
              ) : null}
            </View>

            {busy ? (
              <Text style={[styles.busyText, { color: colors.textMuted }]}>
                Working...
              </Text>
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
    maxHeight: "90%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 6,
  },
  headTitle: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  scroll: {
    paddingBottom: 10,
  },
  identity: {
    alignItems: "center",
    paddingTop: 8,
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
  rolePill: {
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  roleText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  quickRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  quickAction: {
    flex: 1,
    minHeight: 62,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 4,
  },
  quickLabel: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  bio: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  tabs: {
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 1,
    padding: 3,
    marginTop: 9,
    gap: 3,
  },
  tab: {
    flex: 1,
    minHeight: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  tabText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  tabBody: {
    marginTop: 10,
  },
  emptyTab: {
    fontSize: 12.5,
    paddingVertical: 12,
    textAlign: "center",
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  mediaCell: {
    width: "31.5%",
    aspectRatio: 1,
    borderRadius: 9,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  audioList: {
    gap: 7,
  },
  linkList: {
    gap: 6,
  },
  linkRow: {
    minHeight: 42,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
  },
  docText: {
    flex: 1,
    minWidth: 0,
  },
  docSize: {
    marginTop: 1,
    fontSize: 10.5,
  },
  members: {
    marginBottom: 6,
  },
  membersHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  addMembers: {
    fontSize: 11.5,
    fontWeight: "800",
  },
  memberRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
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
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  actions: {
    marginTop: 8,
  },
  panelRow: {
    minHeight: 56,
    borderRadius: 14,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  panelIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  panelText: {
    flex: 1,
    minWidth: 0,
  },
  panelLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  panelHint: {
    marginTop: 2,
    fontSize: 11.5,
  },
  busyText: {
    marginTop: 6,
    fontSize: 11.5,
    textAlign: "center",
  },
});
