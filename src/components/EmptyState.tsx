import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";
import { GradientButton } from "./GradientButton";

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const EmptyState = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) => {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textMuted }]}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <GradientButton
          label={actionLabel}
          onPress={onAction}
          icon="add"
          style={styles.action}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 34,
    paddingBottom: 40,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  action: {
    marginTop: 22,
    minWidth: 180,
  },
});
