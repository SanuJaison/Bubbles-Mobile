import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { useTheme } from "../theme";

type ScreenProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
  padded?: boolean;
};

export const Screen = ({
  children,
  style,
  edges = ["top", "left", "right"],
  padded = false,
}: ScreenProps) => {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.safe, { backgroundColor: colors.background }, style]}
    >
      <View style={[styles.content, padded && styles.padded]}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: 20,
  },
});
