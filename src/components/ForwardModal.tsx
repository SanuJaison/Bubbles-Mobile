import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import type { Conversation } from "../types";
import { Avatar } from "./Avatar";

type ForwardModalProps = {
  visible: boolean;
  conversations: Conversation[];
  excludeChatId?: string;
  title?: string;
  onClose: () => void;
  onForward: (chatIds: string[]) => Promise<void> | void;
};

export const ForwardModal = ({
  visible,
  conversations,
  excludeChatId,
  title = "Forward to",
  onClose,
  onForward,
}: ForwardModalProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const options = conversations.filter(
    (conversation) => conversation.id !== excludeChatId
  );

  const toggle = (chatId: string) => {
    setSelected((current) =>
      current.includes(chatId)
        ? current.filter((id) => id !== chatId)
        : [...current, chatId]
    );
  };

  const handleClose = () => {
    if (submitting) return;
    setSelected([]);
    onClose();
  };

  const handleForward = async () => {
    if (selected.length === 0 || submitting) return;

    setSubmitting(true);
    try {
      await onForward(selected);
      setSelected([]);
      onClose();
    } catch {
      // The caller shows the failure. Keep the sheet open so the user can
      // choose another chat or try again.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
        onPress={handleClose}
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
          <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Choose one or more chats
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={10}
              style={({ pressed }) => [
                styles.close,
                {
                  backgroundColor: colors.surfaceAlt,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          {options.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Start a chat before forwarding messages.
              </Text>
            </View>
          ) : (
            <FlatList
              data={options}
              keyExtractor={(item) => item.id}
              style={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const checked = selected.includes(item.id);

                return (
                  <Pressable
                    onPress={() => toggle(item.id)}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        backgroundColor: pressed ? colors.surfaceAlt : "transparent",
                      },
                    ]}
                  >
                    <Avatar
                      name={item.title}
                      uri={item.avatar}
                      size={44}
                      isGroup={item.isGroup}
                    />
                    <View style={styles.rowText}>
                      <Text
                        numberOfLines={1}
                        style={[styles.rowTitle, { color: colors.text }]}
                      >
                        {item.title}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.rowSubtitle, { color: colors.textMuted }]}
                      >
                        {item.isGroup ? `${item.memberCount || 0} members` : "Direct chat"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.check,
                        {
                          backgroundColor: checked
                            ? colors.primary
                            : "transparent",
                          borderColor: checked ? colors.primary : colors.borderStrong,
                        },
                      ]}
                    >
                      {checked ? (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      ) : null}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}

          <Pressable
            onPress={handleForward}
            disabled={selected.length === 0 || submitting}
            style={({ pressed }) => [
              styles.forwardButton,
              {
                backgroundColor:
                  selected.length === 0 ? colors.surfaceAlt : colors.primaryDeep,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="arrow-redo-outline" size={18} color="#FFFFFF" />
                <Text style={styles.forwardText}>
                  Forward{selected.length > 0 ? ` to ${selected.length}` : ""}
                </Text>
              </>
            )}
          </Pressable>
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
    maxHeight: "78%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 2,
    paddingBottom: 10,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12.5,
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flexGrow: 0,
  },
  row: {
    minHeight: 62,
    borderRadius: 15,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  rowSubtitle: {
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
  empty: {
    paddingVertical: 34,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13.5,
    textAlign: "center",
  },
  forwardButton: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  forwardText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
