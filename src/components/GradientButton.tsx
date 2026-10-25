import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { brandGradient, useTheme } from "../theme";

type GradientButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  style?: StyleProp<ViewStyle>;
};

export const GradientButton = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
  variant = "primary",
  style,
}: GradientButtonProps) => {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const content = (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? "#FFFFFF" : colors.primary}
        />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={
                variant === "primary" || variant === "danger"
                  ? "#FFFFFF"
                  : colors.text
              }
            />
          ) : null}
          <Text
            style={[
              styles.label,
              {
                color:
                  variant === "primary" || variant === "danger"
                    ? "#FFFFFF"
                    : colors.text,
              },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </>
  );

  if (variant === "primary") {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.pressable,
          style,
          { opacity: isDisabled ? 0.55 : pressed ? 0.88 : 1 },
        ]}
      >
        <LinearGradient
          colors={[...brandGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.pressable,
        styles.plain,
        {
          backgroundColor:
            variant === "danger"
              ? colors.danger
              : variant === "secondary"
                ? colors.surfaceAlt
                : "transparent",
          borderColor: variant === "ghost" ? "transparent" : colors.border,
          opacity: isDisabled ? 0.55 : pressed ? 0.82 : 1,
        },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 16,
    overflow: "hidden",
  },
  gradient: {
    minHeight: 54,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  plain: {
    minHeight: 54,
    paddingHorizontal: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
  },
});
