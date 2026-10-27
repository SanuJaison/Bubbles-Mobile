import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";

type EmojiCategory = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  emojis: string[];
};

const CATEGORIES: EmojiCategory[] = [
  {
    key: "smileys",
    label: "Smileys",
    icon: "happy-outline",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣",
      "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰",
      "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜",
      "🤪", "🤨", "🧐", "🤓", "😎", "🥳", "😏", "😒",
      "😞", "😔", "😟", "😕", "🙁", "😣", "😖", "😫",
      "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬",
      "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥",
      "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐",
      "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲",
      "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢",
      "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈",
      "👿", "👻", "💀", "🤖", "💩", "😺", "😸", "😹",
    ],
  },
  {
    key: "gestures",
    label: "Gestures",
    icon: "hand-left-outline",
    emojis: [
      "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙",
      "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️",
      "🖖", "👋", "🤝", "🙏", "💪", "🦾", "👏", "🙌",
      "👐", "🤲", "🤜", "🤛", "✊", "👊", "🫶", "🤌",
      "🤏", "🫰", "🫱", "🫲", "🫳", "🫴", "🫵", "🧠",
    ],
  },
  {
    key: "hearts",
    label: "Hearts",
    icon: "heart-outline",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
      "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖",
      "💘", "💝", "💟", "♥️", "💌", "🫀", "😻", "😍",
    ],
  },
  {
    key: "objects",
    label: "Fun",
    icon: "sparkles-outline",
    emojis: [
      "🔥", "✨", "🌟", "⭐", "🌈", "☀️", "🌙", "⚡",
      "💥", "💫", "💦", "💨", "🎉", "🎊", "🎈", "🎁",
      "🎂", "🍕", "🍔", "🍟", "🌮", "🍩", "☕", "🍺",
      "🎵", "🎶", "📷", "🎮", "⚽", "🏀", "🎯", "🚀",
      "💡", "📌", "📎", "🕹️", "🎧", "🍿", "🧋", "🥳",
    ],
  },
  {
    key: "symbols",
    label: "Symbols",
    icon: "checkmark-circle-outline",
    emojis: [
      "✅", "❌", "❓", "❗", "💯", "⚠️", "♻️", "🔔",
      "🔒", "🔓", "💤", "💬", "👁️", "🫡", "🫠", "🥹",
      "🫂", "🪄", "🧿", "🔮", "🎵", "➕", "➖", "✔️",
    ],
  },
];

type EmojiPickerProps = {
  onSelect: (emoji: string) => void;
};

export const EmojiPicker = ({ onSelect }: EmojiPickerProps) => {
  const { colors } = useTheme();
  const [activeKey, setActiveKey] = useState(CATEGORIES[0].key);

  const active =
    CATEGORIES.find((category) => category.key === activeKey) || CATEGORIES[0];

  const handleSelect = (emoji: string) => {
    Haptics.selectionAsync().catch(() => {});
    onSelect(emoji);
  };

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
      ]}
    >
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {CATEGORIES.map((category) => {
          const activeTab = category.key === activeKey;

          return (
            <Pressable
              key={category.key}
              onPress={() => setActiveKey(category.key)}
              accessibilityLabel={category.label}
              style={({ pressed }) => [
                styles.tab,
                {
                  backgroundColor: activeTab
                    ? colors.surface
                    : "transparent",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons
                name={category.icon}
                size={18}
                color={activeTab ? colors.primary : colors.textSoft}
              />
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
      >
        {active.emojis.map((emoji) => (
          <Pressable
            key={`${active.key}-${emoji}`}
            onPress={() => handleSelect(emoji)}
            style={({ pressed }) => [
              styles.emojiButton,
              { opacity: pressed ? 0.55 : 1 },
            ]}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    height: 212,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    overflow: "hidden",
  },
  tabs: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    minHeight: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  emojiButton: {
    width: "12.5%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 23,
  },
});
