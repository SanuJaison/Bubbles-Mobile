import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { GradientButton } from "../components/GradientButton";
import { useTheme } from "../theme";

export default function NotFoundScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        This page floated away
      </Text>
      <Text style={[styles.message, { color: colors.textMuted }]}>
        The screen you were looking for does not exist in Bubbles.
      </Text>
      <GradientButton
        label="Back to chats"
        onPress={() => router.replace("/")}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
  },
  message: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  button: {
    marginTop: 24,
    minWidth: 190,
  },
});
