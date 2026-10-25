import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../theme";
import { BrandMark } from "./BrandMark";
import { Screen } from "./Screen";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  showBrand?: boolean;
};

export const AuthShell = ({
  title,
  subtitle,
  children,
  footer,
  onBack,
  showBrand = true,
}: AuthShellProps) => {
  const { colors } = useTheme();

  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {onBack ? (
            <Pressable
              onPress={onBack}
              hitSlop={10}
              style={({ pressed }) => [
                styles.back,
                {
                  backgroundColor: colors.surfaceAlt,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Ionicons name="arrow-back" size={21} color={colors.text} />
            </Pressable>
          ) : null}

          {showBrand ? (
            <View style={styles.brand}>
              <BrandMark size={72} />
            </View>
          ) : null}

          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {subtitle}
          </Text>

          <View style={styles.form}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 34,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 22,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 9,
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  form: {
    marginTop: 28,
    gap: 15,
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
  },
});
