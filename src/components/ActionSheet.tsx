import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";

export type ActionSheetOption = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
};

type ActionSheetProps = {
  visible: boolean;
  title?: string;
  header?: ReactNode;
  options: ActionSheetOption[];
  onClose: () => void;
};

export const ActionSheet = ({
  visible,
  title,
  header,
  options,
  onClose,
}: ActionSheetProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const maxListHeight = Math.max(220, height * 0.62);

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
          <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
          {title ? (
            <Text style={[styles.title, { color: colors.textMuted }]}>
              {title}
            </Text>
          ) : null}

          {header ? <View style={styles.header}>{header}</View> : null}

          <ScrollView
            style={{ maxHeight: maxListHeight }}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {options.map((option) => (
              <Pressable
                key={option.label}
                onPress={() => {
                  onClose();
                  option.onPress();
                }}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: pressed ? colors.surfaceAlt : "transparent",
                  },
                ]}
              >
                {option.icon ? (
                  <Ionicons
                    name={option.icon}
                    size={21}
                    color={option.destructive ? colors.danger : colors.text}
                  />
                ) : null}
                <Text
                  style={[
                    styles.optionText,
                    { color: option.destructive ? colors.danger : colors.text },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancel,
              {
                backgroundColor: pressed ? colors.surfaceAlt : colors.surfaceAlt,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>
              Cancel
            </Text>
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
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  header: {
    paddingBottom: 8,
  },
  option: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  optionText: {
    fontSize: 15,
    fontWeight: "600",
  },
  cancel: {
    marginTop: 8,
    minHeight: 50,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
