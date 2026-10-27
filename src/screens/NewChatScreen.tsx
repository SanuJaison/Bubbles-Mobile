import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createGroupAPI, createOrGetChatAPI } from "../api/chats";
import { getAllUsersAPI } from "../api/auth";
import { getErrorMessage } from "../api/client";
import { Avatar } from "../components/Avatar";
import { GradientButton } from "../components/GradientButton";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { useAuth } from "../context/AuthContext";
import { useChats } from "../context/ChatsContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../theme";
import type { Chat, User } from "../types";
import { userIdOf } from "../utils/chat";

type Mode = "direct" | "group";

export default function NewChatScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { upsertConversation } = useChats();
  const { showToast } = useToast();
  const [mode, setMode] = useState<Mode>("direct");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const currentUserId = userIdOf(user);

  const loadUsers = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const response = await getAllUsersAPI();
        const list = Array.isArray(response.data?.users)
          ? response.data.users
          : [];

        setUsers(
          list.filter((item) => userIdOf(item) !== currentUserId)
        );
      } catch (error) {
        showToast(
          getErrorMessage(error, "Unable to load people right now."),
          "error"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentUserId, showToast]
  );

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  const query = search.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    // Privacy: never reveal the full member list. People only appear after the
    // user types a search, and only when their name or username matches.
    if (!query) return [];

    return users.filter((item) => {
      const haystack = [item.name, item.username]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [users, query]);

  const selectedUsers = users.filter((item) =>
    selectedIds.includes(userIdOf(item))
  );

  const toggleUser = (userId: string) => {
    setSelectedIds((previous) =>
      previous.includes(userId)
        ? previous.filter((id) => id !== userId)
        : [...previous, userId]
    );
  };

  const openChat = (chat: Chat) => {
    upsertConversation(chat);
    router.replace({
      pathname: "/chat/[chatId]",
      params: { chatId: String(chat._id) },
    });
  };

  const handleDirectChat = async (selectedUser: User) => {
    if (creating) return;
    setCreating(true);

    try {
      const response = await createOrGetChatAPI(userIdOf(selectedUser));
      const chat = response.data?.chat;

      if (!chat) throw new Error("The chat could not be created.");
      openChat(chat);
    } catch (error) {
      showToast(
        getErrorMessage(error, "Unable to start this chat."),
        "error"
      );
    } finally {
      setCreating(false);
    }
  };

  const handleCreateGroup = async () => {
    if (creating) return;

    const name = groupName.trim();
    if (!name) {
      showToast("Give your group a name.", "info");
      return;
    }

    if (selectedIds.length === 0) {
      showToast("Choose at least one person for the group.", "info");
      return;
    }

    setCreating(true);

    try {
      const response = await createGroupAPI({
        name,
        description: groupDescription.trim(),
        participantIds: selectedIds,
      });
      const chat = response.data?.chat;

      if (!chat) throw new Error("The group could not be created.");
      showToast("Group created", "success");
      openChat(chat);
    } catch (error) {
      showToast(
        getErrorMessage(error, "Unable to create this group."),
        "error"
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [
            styles.back,
            {
              backgroundColor: colors.surfaceAlt,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="arrow-back" size={21} color={colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>New chat</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {mode === "group"
              ? "Bring people together"
              : "Find someone to message"}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.segment,
          { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
        ]}
      >
        <Pressable
          onPress={() => setMode("direct")}
          style={[
            styles.segmentButton,
            mode === "direct" && { backgroundColor: colors.surface },
          ]}
        >
          <Ionicons
            name="person-outline"
            size={16}
            color={mode === "direct" ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.segmentText,
              {
                color: mode === "direct" ? colors.text : colors.textMuted,
              },
            ]}
          >
            Direct
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode("group")}
          style={[
            styles.segmentButton,
            mode === "group" && { backgroundColor: colors.surface },
          ]}
        >
          <Ionicons
            name="people-outline"
            size={17}
            color={mode === "group" ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.segmentText,
              {
                color: mode === "group" ? colors.text : colors.textMuted,
              },
            ]}
          >
            Group
          </Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.searchWrap,
          { backgroundColor: colors.input, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search-outline" size={19} color={colors.textSoft} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or username"
          placeholderTextColor={colors.textSoft}
          selectionColor={colors.primary}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => userIdOf(item)}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadUsers(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          mode === "group" ? (
            <View style={styles.groupForm}>
              <TextField
                label="Group name"
                icon="people-outline"
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Weekend crew"
                maxLength={80}
              />
              <TextField
                label="Description (optional)"
                icon="document-text-outline"
                value={groupDescription}
                onChangeText={setGroupDescription}
                placeholder="What is this group about?"
                maxLength={500}
                multiline
              />

              {selectedUsers.length > 0 ? (
                <View style={styles.selectedWrap}>
                  <Text style={[styles.selectedLabel, { color: colors.textMuted }]}>
                    {selectedUsers.length} selected
                  </Text>
                  <View style={styles.selectedChips}>
                    {selectedUsers.map((item) => (
                      <View
                        key={userIdOf(item)}
                        style={[
                          styles.selectedChip,
                          { backgroundColor: colors.primarySoft },
                        ]}
                      >
                        <Text
                          numberOfLines={1}
                          style={[styles.selectedName, { color: colors.primary }]}
                        >
                          {item.name}
                        </Text>
                        <Pressable onPress={() => toggleUser(userIdOf(item))}>
                          <Ionicons
                            name="close"
                            size={14}
                            color={colors.primary}
                          />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <GradientButton
                label="Create group"
                onPress={handleCreateGroup}
                loading={creating}
                disabled={!groupName.trim() || selectedIds.length === 0}
                icon="people-outline"
              />

              <Text style={[styles.chooseLabel, { color: colors.textMuted }]}>
                Choose members
              </Text>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => {
          const itemId = userIdOf(item);
          const selected = selectedIds.includes(itemId);

          return (
            <Pressable
              onPress={() => {
                if (mode === "group") {
                  toggleUser(itemId);
                } else {
                  handleDirectChat(item);
                }
              }}
              style={({ pressed }) => [
                styles.userRow,
                {
                  backgroundColor: pressed ? colors.surfaceAlt : "transparent",
                },
              ]}
            >
              <Avatar
                name={item.name}
                uri={item.profilePicture}
                size={48}
                online={item.isOnline}
                showOnline
              />
              <View style={styles.userText}>
                <Text
                  numberOfLines={1}
                  style={[styles.userName, { color: colors.text }]}
                >
                  {item.name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.userHandle, { color: colors.textMuted }]}
                >
                  {item.username ? `@${item.username}` : item.email || "Bubbles user"}
                </Text>
              </View>

              {mode === "group" ? (
                <View
                  style={[
                    styles.check,
                    {
                      backgroundColor: selected ? colors.primary : "transparent",
                      borderColor: selected
                        ? colors.primary
                        : colors.borderStrong,
                    },
                  ]}
                >
                  {selected ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  ) : null}
                </View>
              ) : (
                <Ionicons
                  name="chatbubble-outline"
                  size={19}
                  color={colors.primary}
                />
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : query ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No people found
              </Text>
              <Text style={[styles.emptyCopy, { color: colors.textMuted }]}>
                Try another name or username.
              </Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <View
                style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}
              >
                <Ionicons
                  name="search-outline"
                  size={26}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {mode === "group" ? "Search for members" : "Search for someone"}
              </Text>
              <Text style={[styles.emptyCopy, { color: colors.textMuted }]}>
                {mode === "group"
                  ? "Type a name or username to find people for your group."
                  : "Type a name or username above. People are only shown when you search."}
              </Text>
            </View>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11.5,
  },
  segment: {
    marginHorizontal: 18,
    minHeight: 46,
    borderRadius: 15,
    borderWidth: 1,
    padding: 4,
    flexDirection: "row",
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "700",
  },
  searchWrap: {
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 8,
    minHeight: 46,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14.5,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  groupForm: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 12,
    gap: 12,
  },
  selectedWrap: {
    gap: 7,
  },
  selectedLabel: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  selectedChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  selectedChip: {
    maxWidth: 170,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  selectedName: {
    flexShrink: 1,
    fontSize: 11.5,
    fontWeight: "700",
  },
  chooseLabel: {
    marginTop: 2,
    fontSize: 11.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 18,
  },
  userRow: {
    minHeight: 64,
    marginHorizontal: 18,
    borderRadius: 15,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  userText: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  userHandle: {
    marginTop: 3,
    fontSize: 11.5,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  emptyCopy: {
    marginTop: 6,
    fontSize: 13,
    textAlign: "center",
  },
});
