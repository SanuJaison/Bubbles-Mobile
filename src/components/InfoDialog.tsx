import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";

type InfoDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  buttonLabel?: string;
  onClose: () => void;
};

export const InfoDialog = ({
  visible,
  title,
  message,
  buttonLabel = "Got it",
  onClose,
}: InfoDialogProps) => {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>
            {message}
          </Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.primaryDeep, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
  },
  message: {
    marginTop: 9,
    fontSize: 14,
    lineHeight: 21,
  },
  button: {
    marginTop: 22,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
