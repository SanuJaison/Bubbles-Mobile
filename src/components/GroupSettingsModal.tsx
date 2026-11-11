import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { GroupAvatarImage } from "../api/chats";
import { getErrorMessage } from "../api/client";
import { useTheme } from "../theme";
import type { Chat, Conversation } from "../types";
import { Avatar } from "./Avatar";
import { useToast } from "../context/ToastContext";
import { KeyboardAwareView } from "./KeyboardAwareView";

type PermissionKey = "sendMessages" | "addMembers" | "editInfo";
type PermissionValue = "all" | "admins";

type GroupSettingsModalProps = {
  visible: boolean;
  conversation: Conversation | null;
  isAdmin: boolean;
  canEditInfo: boolean;
  busy?: boolean;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    description: string;
    avatar: GroupAvatarImage | null;
  }) => void;
  onPermissionChange?: (key: PermissionKey, value: PermissionValue) => void;
};

const PERMISSION_ROWS: {
  key: PermissionKey;
  label: string;
  hint: string;
  fallback: PermissionValue;
}[] = [
  {
    key: "sendMessages",
    label: "Send messages",
    hint: "Who can post in this group",
    fallback: "all",
  },
  {
    key: "addMembers",
    label: "Add members",
    hint: "Who can bring new people in",
    fallback: "all",
  },
  {
    key: "editInfo",
    label: "Edit group info",
    hint: "Who can change the name, photo and description",
    fallback: "admins",
  },
];

export const GroupSettingsModal = ({
  visible,
  conversation,
  isAdmin,
  canEditInfo,
  busy = false,
  onClose,
  onSave,
  onPermissionChange,
}: GroupSettingsModalProps) => {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(conversation?.title || "");
  const [description, setDescription] = useState(
    conversation?.groupDescription || ""
  );
  const [avatar, setAvatar] = useState<GroupAvatarImage | null>(null);
  const [error, setError] = useState("");

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) return;

      setAvatar({
        uri: asset.uri,
        name: asset.fileName || `group-${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      });
    } catch (pickError) {
      showToast(
        getErrorMessage(pickError, "Unable to open your photos."),
        "error"
      );
    }
  };

  const handleSave = () => {
    const cleanName = name.trim();

    if (!cleanName) {
      setError("A group needs a name.");
      return;
    }

    if (cleanName.length > 80) {
      setError("Group names can be up to 80 characters.");
      return;
    }

    if (description.trim().length > 500) {
      setError("Group descriptions can be up to 500 characters.");
      return;
    }

    setError("");
    onSave({
      name: cleanName,
      description: description.trim(),
      avatar,
    });
  };

  const permissions: Chat["groupPermissions"] =
    conversation?.groupPermissions || {};

  const avatarUri = avatar?.uri || conversation?.avatar;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <KeyboardAwareView style={styles.flex}>
        <Pressable
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          onPress={() => {
            if (!busy) onClose();
          }}
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
              <View style={styles.headText}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Group settings
                </Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  {isAdmin
                    ? "Update the group and decide what members can do."
                    : "Update how this group looks to everyone."}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                disabled={busy}
                style={{ opacity: busy ? 0.4 : 1 }}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {canEditInfo ? (
                <>
                  <View style={styles.avatarRow}>
                    <Pressable onPress={handlePickAvatar} disabled={busy}>
                      <Avatar
                        name={name || conversation?.title || "Group"}
                        uri={avatarUri}
                        size={78}
                        isGroup
                      />
                      <View
                        style={[
                          styles.cameraBadge,
                          {
                            backgroundColor: colors.primary,
                            borderColor: colors.surface,
                          },
                        ]}
                      >
                        <Ionicons name="camera" size={13} color="#FFFFFF" />
                      </View>
                    </Pressable>
                    <View style={styles.avatarText}>
                      <Text style={[styles.avatarTitle, { color: colors.text }]}>
                        Group photo
                      </Text>
                      <Text
                        style={[styles.avatarHint, { color: colors.textMuted }]}
                      >
                        Tap the photo to pick a new one.
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.label, { color: colors.textSoft }]}>
                    Group name
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Group name"
                    placeholderTextColor={colors.textSoft}
                    selectionColor={colors.primary}
                    maxLength={80}
                    editable={!busy}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.input,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                  />

                  <Text style={[styles.label, { color: colors.textSoft }]}>
                    Description
                  </Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="What is this group about?"
                    placeholderTextColor={colors.textSoft}
                    selectionColor={colors.primary}
                    multiline
                    maxLength={500}
                    editable={!busy}
                    style={[
                      styles.input,
                      styles.multiline,
                      {
                        backgroundColor: colors.input,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                  />

                  {error ? (
                    <Text style={[styles.error, { color: colors.danger }]}>
                      {error}
                    </Text>
                  ) : null}
                </>
              ) : null}

              {isAdmin ? (
                <View style={styles.permissions}>
                  <Text style={[styles.label, { color: colors.textSoft }]}>
                    Permissions
                  </Text>

                  {PERMISSION_ROWS.map((row) => {
                    const value = permissions[row.key] || row.fallback;

                    return (
                      <View
                        key={row.key}
                        style={[
                          styles.permissionRow,
                          { borderColor: colors.border },
                        ]}
                      >
                        <View style={styles.permissionText}>
                          <Text
                            style={[
                              styles.permissionLabel,
                              { color: colors.text },
                            ]}
                          >
                            {row.label}
                          </Text>
                          <Text
                            style={[
                              styles.permissionHint,
                              { color: colors.textMuted },
                            ]}
                          >
                            {row.hint}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.segmented,
                            {
                              backgroundColor: colors.surfaceAlt,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          {(["all", "admins"] as PermissionValue[]).map(
                            (option) => {
                              const active = value === option;

                              return (
                                <Pressable
                                  key={option}
                                  disabled={busy}
                                  onPress={() =>
                                    onPermissionChange?.(row.key, option)
                                  }
                                  style={[
                                    styles.segment,
                                    active && {
                                      backgroundColor: colors.primary,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.segmentText,
                                      {
                                        color: active
                                          ? "#FFFFFF"
                                          : colors.textMuted,
                                      },
                                    ]}
                                  >
                                    {option === "all" ? "Everyone" : "Admins"}
                                  </Text>
                                </Pressable>
                              );
                            }
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </ScrollView>

            {canEditInfo ? (
              <View style={styles.actions}>
                <Pressable
                  onPress={onClose}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.cancel,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.border,
                      opacity: pressed || busy ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.cancelText, { color: colors.text }]}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleSave}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.save,
                    {
                      backgroundColor: colors.primaryDeep,
                      opacity: busy ? 0.6 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveText}>Save changes</Text>
                  )}
                </Pressable>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </KeyboardAwareView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
    paddingTop: 16,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingBottom: 10,
  },
  headText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
  },
  scroll: {
    flexGrow: 0,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingBottom: 6,
  },
  avatarText: {
    flex: 1,
    minWidth: 0,
  },
  avatarTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  avatarHint: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
  },
  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  error: {
    marginTop: 8,
    fontSize: 12.5,
    fontWeight: "600",
  },
  permissions: {
    marginTop: 2,
  },
  permissionRow: {
    borderTopWidth: 1,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  permissionText: {
    flex: 1,
    minWidth: 0,
  },
  permissionLabel: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  permissionHint: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
  },
  segmented: {
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 1,
    padding: 2,
    gap: 2,
  },
  segment: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 9,
    paddingTop: 12,
  },
  cancel: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  save: {
    flex: 1.4,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
