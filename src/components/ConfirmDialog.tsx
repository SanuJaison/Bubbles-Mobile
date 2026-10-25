import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmDialog = ({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
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

          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              disabled={loading}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: colors.surfaceAlt,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                {cancelLabel}
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={loading}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: destructive ? colors.danger : colors.primaryDeep,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.buttonText, { color: "#FFFFFF" }]}>
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </View>
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
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
