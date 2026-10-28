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
import { deleteChatAPI, deleteGroupAPI, clearChatAPI, leaveGroupAPI } from "../api/chats";
import { getErrorMessage } from "../api/client";
import { ActionSheet, type ActionSheetOption } from "../components/ActionSheet";
import { AddPeopleModal } from "../components/AddPeopleModal";
import { BrandMark } from "../components/BrandMark";
import { ChatListItem } from "../components/ChatListItem";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { useChatPrefs } from "../context/ChatPrefsContext";
import { useChats } from "../context/ChatsContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../theme";
import type { Conversation } from "../types";
import { userIdOf } from "../utils/chat";
import { getAIHistorySummary } from "../storage/aiStorage";

type AISummary = {
  hasConversation: boolean;
  lastMessage: string;
  lastMessageAt: string | null;
};

export default function ChatsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const {
    conversations,
    loading,
    refreshing,
    error,
    refreshChats,
    removeConversation,
  } = useChats();
  const [search, setSearch] = useState("");
  const [aiSummary, setAiSummary] = useState<AISummary>({
    hasConversation: false,
    lastMessage: "",
    lastMessageAt: null,
  });
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [groupConfirmOpen, setGroupConfirmOpen] = useState(false);
  const [groupBusy, setGroupBusy] = useState(false);
  const [groupAction, setGroupAction] = useState<"leave" | "delete">("delete");
  const [addPeopleOpen, setAddPeopleOpen] = useState(false);

  const {
    isFavorite,
    isPinned,
    isMuted,
    toggleFavorite,
    togglePinned,
    toggleMuted,
  } = useChatPrefs();

  const currentUserId = userIdOf(user);

  const reloadAISummary = useCallback(async () => {
    const summary = await getAIHistorySummary(currentUserId);
    setAiSummary(summary);
  }, [currentUserId]);

  useFocusEffect(
    useCallback(() => {
      refreshChats(true);
      reloadAISummary();
    }, [refreshChats, reloadAISummary])
  );

  const query = search.trim().toLowerCase();

  const sortedChats = useMemo(() => {
    // Pinned chats float to the top while keeping the server's recency order
    // inside each group (Array.prototype.sort is stable in Hermes/V8).
    return [...conversations].sort(
      (first, second) =>
        Number(isPinned(second.id)) - Number(isPinned(first.id))
    );
  }, [conversations, isPinned]);

  const filteredChats = useMemo(() => {
    if (!query) return sortedChats;

    return sortedChats.filter((conversation) => {
      const haystack = [
        conversation.title,
        conversation.lastMessage,
        conversation.lastMessageSenderName,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [sortedChats, query]);

  const showAI =
    aiSummary.hasConversation &&
    (!query || "bubbles ai assistant".includes(query));

  const aiConversation: Conversation = {
    id: "bubbles-ai",
    title: "Bubbles AI",
    subtitle: "Your private assistant",
    isGroup: false,
    participants: [],
    lastMessage: aiSummary.lastMessage || "Ask me anything about Bubbles",
    lastMessageAt: aiSummary.lastMessageAt,
    lastMessageSenderName: "",
    unread: 0,
    online: false,
  };

  const openChat = (conversation: Conversation) => {
    router.push({
      pathname: "/chat/[chatId]",
      params: { chatId: conversation.id },
    });
  };

  const handleDeleteChat = async () => {
    if (!selectedChat || deleting) return;

    setDeleting(true);
    try {
      await deleteChatAPI(selectedChat.id);
      removeConversation(selectedChat.id);
      setDeleteConfirmOpen(false);
      setSelectedChat(null);
      showToast("Chat deleted", "success");
    } catch (deleteError) {
      showToast(
        getErrorMessage(deleteError, "Unable to delete this chat."),
        "error"
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleClearChat = async () => {
    if (!selectedChat || clearing) return;

    setClearing(true);
    try {
      await clearChatAPI(selectedChat.id);
      setClearConfirmOpen(false);
      setSelectedChat(null);
      showToast("Chat cleared", "success");
    } catch (clearError) {
      showToast(
        getErrorMessage(clearError, "Unable to clear this chat."),
        "error"
      );
    } finally {
      setClearing(false);
    }
  };

  const handleGroupAction = async () => {
    if (!selectedChat || groupBusy) return;

    setGroupBusy(true);
    try {
      if (groupAction === "leave") {
        await leaveGroupAPI(selectedChat.id);
      } else {
        await deleteGroupAPI(selectedChat.id);
      }

      removeConversation(selectedChat.id);
      setGroupConfirmOpen(false);
      setSelectedChat(null);
      showToast(
        groupAction === "leave" ? "You left the group" : "Group deleted",
        "success"
      );
    } catch (groupError) {
      showToast(
        getErrorMessage(
          groupError,
          groupAction === "leave"
            ? "Unable to leave this group."
            : "Unable to delete this group."
        ),
        "error"
      );
    } finally {
      setGroupBusy(false);
    }
  };

  const refreshAll = () => {
    refreshChats();
    reloadAISummary();
  };

  const selectedIsGroup = Boolean(selectedChat?.isGroup);
  const selectedIsCreator = Boolean(
    selectedIsGroup &&
      selectedChat?.groupCreatedBy &&
      String(selectedChat.groupCreatedBy) === currentUserId
  );
  const selectedIsPinned = isPinned(selectedChat?.id);
  const selectedIsFavorite = isFavorite(selectedChat?.id);
  const selectedIsMuted = isMuted(selectedChat?.id);

  const chatMenuOptions: ActionSheetOption[] = selectedChat
    ? [
        ...(selectedIsGroup
          ? []
          : [
              {
                label: "Add to group",
                icon: "person-add-outline" as const,
                onPress: () => setAddPeopleOpen(true),
              },
            ]),
        {
          label: selectedIsPinned ? "Unpin chat" : "Pin chat to top",
          icon: selectedIsPinned ? "pin-outline" : "pin",
          onPress: () => {
            togglePinned(selectedChat.id);
            showToast(
              selectedIsPinned ? "Chat unpinned" : "Chat pinned to top",
              "success"
            );
          },
        },
        {
          label: selectedIsFavorite
            ? "Remove from favourites"
            : "Add to favourites",
          icon: selectedIsFavorite ? "star" : "star-outline",
          onPress: () => {
            toggleFavorite(selectedChat.id);
            showToast(
              selectedIsFavorite
                ? "Removed from favourites"
                : "Added to favourites",
              "success"
            );
          },
        },
        {
          label: selectedIsMuted
            ? "Unmute notifications"
            : "Mute notifications",
          icon: selectedIsMuted
            ? "notifications-outline"
            : "notifications-off-outline",
          onPress: () => {
            toggleMuted(selectedChat.id);
            showToast(
              selectedIsMuted
                ? "Notifications unmuted"
                : "Notifications muted",
              "success"
            );
          },
        },
        {
          label: "Clear chat",
          icon: "sparkles-outline",
          onPress: () => setClearConfirmOpen(true),
        },
        ...(selectedIsGroup
          ? selectedIsCreator
            ? [
                {
                  label: "Delete group",
                  icon: "trash-outline" as const,
                  destructive: true,
                  onPress: () => {
                    setGroupAction("delete");
                    setGroupConfirmOpen(true);
                  },
                },
              ]
            : [
                {
                  label: "Exit group",
                  icon: "log-out-outline" as const,
                  destructive: true,
                  onPress: () => {
                    setGroupAction("leave");
                    setGroupConfirmOpen(true);
                  },
                },
              ]
          : [
              {
                label: "Delete chat",
                icon: "trash-outline" as const,
                destructive: true,
                onPress: () => setDeleteConfirmOpen(true),
              },
            ]),
      ]
    : [];

  return (
    <Screen>
      <View style={styles.header}>
        <BrandMark size={38} />
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Chats</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {conversations.length === 0
              ? "Your conversations live here"
              : `${conversations.length} conversation${
                  conversations.length === 1 ? "" : "s"
                }`}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/new-chat")}
          style={({ pressed }) => [
            styles.newButton,
            {
              backgroundColor: colors.primarySoft,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="create-outline" size={21} color={colors.primary} />
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
          placeholder="Search chats"
          placeholderTextColor={colors.textSoft}
          selectionColor={colors.primary}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.searchInput, { color: colors.text }]}
        />
        {search ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={19} color={colors.textSoft} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View
          style={[styles.errorBanner, { backgroundColor: colors.accentSoft }]}
        >
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error}
          </Text>
          <Pressable onPress={() => refreshChats()}>
            <Text style={[styles.retry, { color: colors.primary }]}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshAll}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          showAI ? (
            <ChatListItem
              conversation={aiConversation}
              isAI
              onPress={() => router.push("/ai")}
            />
          ) : undefined
        }
        renderItem={({ item }) => (
          <ChatListItem
            conversation={item}
            isPinned={isPinned(item.id)}
            isFavorite={isFavorite(item.id)}
            isMuted={isMuted(item.id)}
            onPress={() => openChat(item)}
            onLongPress={() => {
              setSelectedChat(item);
              setChatMenuOpen(true);
            }}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : query ? (
            <View style={styles.noResults}>
              <Ionicons
                name="search-outline"
                size={28}
                color={colors.textSoft}
              />
              <Text style={[styles.noResultsTitle, { color: colors.text }]}>
                No chats found
              </Text>
              <Text style={[styles.noResultsCopy, { color: colors.textMuted }]}>
                Try a different name or message.
              </Text>
            </View>
          ) : (
            <EmptyState
              icon="chatbubbles-outline"
              title="No conversations yet"
              message="Start a direct chat or bring a few people together in a group."
              actionLabel="Start a chat"
              onAction={() => router.push("/new-chat")}
            />
          )
        }
      />

      <Pressable
        onPress={() => router.push("/new-chat")}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primaryDeep,
            opacity: pressed ? 0.82 : 1,
          },
        ]}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      <ActionSheet
        visible={chatMenuOpen}
        title={selectedChat?.title}
        options={chatMenuOptions}
        onClose={() => setChatMenuOpen(false)}
      />

      <ConfirmDialog
        visible={deleteConfirmOpen}
        title="Delete this chat?"
        message="This removes the chat from your chat list. A new message will bring it back."
        confirmLabel="Delete chat"
        destructive
        loading={deleting}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setSelectedChat(null);
        }}
        onConfirm={handleDeleteChat}
      />

      <ConfirmDialog
        visible={clearConfirmOpen}
        title="Clear this chat?"
        message="This removes the messages from your view. Other members keep their copy."
        confirmLabel="Clear chat"
        destructive
        loading={clearing}
        onCancel={() => {
          setClearConfirmOpen(false);
          setSelectedChat(null);
        }}
        onConfirm={handleClearChat}
      />

      <ConfirmDialog
        visible={groupConfirmOpen}
        title={
          groupAction === "leave" ? "Exit this group?" : "Delete this group?"
        }
        message={
          groupAction === "leave"
            ? "You will stop receiving messages from this group."
            : "This removes the group and its messages for everyone. This cannot be undone."
        }
        confirmLabel={groupAction === "leave" ? "Exit group" : "Delete group"}
        destructive
        loading={groupBusy}
        onCancel={() => {
          setGroupConfirmOpen(false);
          setSelectedChat(null);
        }}
        onConfirm={handleGroupAction}
      />

      <AddPeopleModal
        key={addPeopleOpen ? "add-open" : "add-closed"}
        visible={addPeopleOpen}
        mode="group"
        contactUserId={selectedChat?.otherUserId}
        contactName={selectedChat?.title}
        groups={conversations.filter((item) => item.isGroup)}
        onClose={() => setAddPeopleOpen(false)}
        onDone={() => {
          setSelectedChat(null);
          refreshChats(true);
        }}
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
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11.5,
  },
  newButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    marginHorizontal: 18,
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
  errorBanner: {
    marginHorizontal: 18,
    marginBottom: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  retry: {
    fontSize: 13,
    fontWeight: "700",
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 92,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  noResults: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: 60,
  },
  noResultsTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "800",
  },
  noResultsCopy: {
    marginTop: 6,
    fontSize: 13,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
});
