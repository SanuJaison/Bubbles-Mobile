import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAllUsersAPI } from "../api/auth";
import { addGroupMembersAPI } from "../api/chats";
import { getErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../theme";
import type { Conversation, User } from "../types";
import { userIdOf } from "../utils/chat";
import { Avatar } from "./Avatar";

type AddPeopleModalProps = {
  visible: boolean;
  mode: "members" | "group";
  /** Target group when adding members to it. */
  conversation?: Conversation | null;
  /** Direct-chat contact when picking a group to add them to. */
  contactUserId?: string;
  contactName?: string;
  groups?: Conversation[];
  onClose: () => void;
  onDone?: (chatId: string) => void;
};

export const AddPeopleModal = ({
  visible,
  mode,
  conversation,
  contactUserId,
  contactName,
  groups = [],
  onClose,
  onDone,
}: AddPeopleModalProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(
    mode === "members" && visible
  );
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;

    if (mode !== "members") return;

    let active = true;

    getAllUsersAPI()
      .then((response) => {
        if (!active) return;
        setUsers(Array.isArray(response.data?.users) ? response.data.users : []);
      })
      .catch((error) => {
        if (active) {
          showToast(
            getErrorMessage(error, "Unable to load people right now."),
            "error"
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [visible, mode, showToast]);

  const memberIds = useMemo(
    () =>
      new Set(
        (conversation?.participants || []).map((participant) =>
          userIdOf(participant)
        )
      ),
    [conversation]
  );

  const query = search.trim().toLowerCase();

  const results = useMemo(() => {
    // Same privacy rule as the new-chat screen: nobody is listed until the
    // user actually searches for a name or username.
    if (!query) return [];

    return users
      .filter((item) => !memberIds.has(userIdOf(item)))
      .filter((item) =>
        [item.name, item.username]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 40);
  }, [users, query, memberIds]);

  const toggle = (userId: string) =>
    setSelectedIds((previous) =>
      previous.includes(userId)
        ? previous.filter((id) => id !== userId)
        : [...previous, userId]
    );

  const submitMembers = async () => {
    if (!conversation || selectedIds.length === 0 || busy) return;

    setBusy(true);

    try {
      await addGroupMembersAPI(conversation.id, selectedIds);
      showToast(
        selectedIds.length === 1 ? "Member added" : "Members added",
        "success"
      );
      onDone?.(conversation.id);
      onClose();
    } catch (error) {
      showToast(
        getErrorMessage(error, "Unable to add those members."),
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  const submitGroup = async (groupId: string) => {
    if (!contactUserId || busy) return;

    setBusy(true);

    try {
      await addGroupMembersAPI(groupId, [contactUserId]);
      showToast(
        `${contactName || "Contact"} added to the group`,
        "success"
      );
      onDone?.(groupId);
      onClose();
    } catch (error) {
      showToast(
        getErrorMessage(error, "Unable to add this person to the group."),
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "members"
      ? `Add members${conversation ? ` to ${conversation.title}` : ""}`
      : `Add ${contactName || "contact"} to a group`;

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
            <Text
              numberOfLines={2}
              style={[styles.title, { color: colors.text }]}
            >
              {title}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {mode === "members" ? (
            <>
              <View
                style={[
                  styles.searchWrap,
                  { backgroundColor: colors.input, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={colors.textSoft}
                />
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
                data={results}
                keyExtractor={(item) => userIdOf(item)}
                keyboardShouldPersistTaps="handled"
                style={styles.list}
                renderItem={({ item }) => {
                  const itemId = userIdOf(item);
                  const selected = selectedIds.includes(itemId);

                  return (
                    <Pressable
                      onPress={() => toggle(itemId)}
                      style={({ pressed }) => [
                        styles.row,
                        {
                          backgroundColor: pressed
                            ? colors.surfaceAlt
                            : "transparent",
                        },
                      ]}
                    >
                      <Avatar
                        name={item.name}
                        uri={item.profilePicture}
                        size={42}
                        online={item.isOnline}
                        showOnline
                      />
                      <View style={styles.rowText}>
                        <Text
                          numberOfLines={1}
                          style={[styles.rowName, { color: colors.text }]}
                        >
                          {item.name}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[styles.rowHandle, { color: colors.textMuted }]}
                        >
                          {item.username ? `@${item.username}` : "Bubbles user"}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.check,
                          {
                            backgroundColor: selected
                              ? colors.primary
                              : "transparent",
                            borderColor: selected
                              ? colors.primary
                              : colors.borderStrong,
                          },
                        ]}
                      >
                        {selected ? (
                          <Ionicons
                            name="checkmark"
                            size={15}
                            color="#FFFFFF"
                          />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  loading ? (
                    <View style={styles.empty}>
                      <ActivityIndicator color={colors.primary} />
                    </View>
                  ) : (
                    <View style={styles.empty}>
                      <Text style={[styles.emptyTitle, { color: colors.text }]}>
                        {query ? "No people found" : "Search for someone"}
                      </Text>
                      <Text
                        style={[styles.emptyCopy, { color: colors.textMuted }]}
                      >
                        {query
                          ? "Try another name or username."
                          : "People only appear after you search."}
                      </Text>
                    </View>
                  )
                }
              />

              <Pressable
                onPress={submitMembers}
                disabled={selectedIds.length === 0 || busy}
                style={({ pressed }) => [
                  styles.submit,
                  {
                    backgroundColor: colors.primaryDeep,
                    opacity:
                      selectedIds.length === 0 || busy
                        ? 0.5
                        : pressed
                          ? 0.82
                          : 1,
                  },
                ]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>
                    {selectedIds.length > 0
                      ? `Add ${selectedIds.length} ${
                          selectedIds.length === 1 ? "member" : "members"
                        }`
                      : "Add members"}
                  </Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                Choose a group you are part of. {contactName || "This contact"}{" "}
                will join it right away.
              </Text>

              <FlatList
                data={groups}
                keyExtractor={(item) => item.id}
                style={styles.list}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => submitGroup(item.id)}
                    disabled={busy}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        backgroundColor: pressed
                          ? colors.surfaceAlt
                          : "transparent",
                        opacity: busy ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Avatar
                      name={item.title}
                      uri={item.avatar}
                      size={42}
                      isGroup
                    />
                    <View style={styles.rowText}>
                      <Text
                        numberOfLines={1}
                        style={[styles.rowName, { color: colors.text }]}
                      >
                        {item.title}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.rowHandle, { color: colors.textMuted }]}
                      >
                        {item.memberCount || item.participants.length} members
                      </Text>
                    </View>
                    <Ionicons
                      name="add-circle-outline"
                      size={22}
                      color={colors.primary}
                    />
                  </Pressable>
                )}
                ListEmptyComponent={
                  <View style={styles.empty}>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      No groups yet
                    </Text>
                    <Text
                      style={[styles.emptyCopy, { color: colors.textMuted }]}
                    >
                      Create a group first, then add people to it.
                    </Text>
                  </View>
                }
              />
            </>
          )}
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
    maxHeight: "84%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingBottom: 10,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
  },
  searchWrap: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 14,
  },
  list: {
    flexGrow: 0,
    maxHeight: 380,
  },
  row: {
    minHeight: 58,
    borderRadius: 14,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 14,
    fontWeight: "700",
  },
  rowHandle: {
    marginTop: 2,
    fontSize: 11.5,
  },
  check: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 34,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  emptyCopy: {
    marginTop: 5,
    fontSize: 12.5,
    textAlign: "center",
  },
  hint: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 8,
  },
  submit: {
    marginTop: 10,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
