import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";

export const REPORT_REASONS = [
  { id: "spam", label: "Spam or scam" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "impersonation", label: "Impersonation" },
  { id: "other", label: "Something else" },
];

type ReportDialogProps = {
  visible: boolean;
  targetName?: string;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (payload: { reason: string; details: string }) => void;
};

export const ReportDialog = ({
  visible,
  targetName,
  busy = false,
  onClose,
  onSubmit,
}: ReportDialogProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");

  const handleSubmit = () => {
    if (!reason || busy) return;

    onSubmit({
      reason: REPORT_REASONS.find((item) => item.id === reason)?.label || reason,
      details: details.trim(),
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          onPress={() => {
            if (!busy) onClose();
          }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={styles.head}>
              <View style={styles.headText}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {targetName ? `Report ${targetName}` : "Report"}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  Reports are private. Our team reviews every one.
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                disabled={busy}
                style={{ opacity: busy ? 0.4 : 1 }}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {REPORT_REASONS.map((item) => {
                const selected = reason === item.id;

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setReason(item.id)}
                    style={({ pressed }) => [
                      styles.reason,
                      {
                        backgroundColor: selected
                          ? colors.primarySoft
                          : colors.surfaceAlt,
                        borderColor: selected ? colors.primary : colors.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.radio,
                        {
                          borderColor: selected
                            ? colors.primary
                            : colors.borderStrong,
                          backgroundColor: selected
                            ? colors.primary
                            : "transparent",
                        },
                      ]}
                    >
                      {selected ? (
                        <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                      ) : null}
                    </View>
                    <Text style={[styles.reasonText, { color: colors.text }]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}

              <Text style={[styles.label, { color: colors.textSoft }]}>
                Details (optional)
              </Text>
              <TextInput
                value={details}
                onChangeText={setDetails}
                placeholder="Tell us what happened..."
                placeholderTextColor={colors.textSoft}
                selectionColor={colors.primary}
                multiline
                maxLength={1000}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
            </ScrollView>

            <View style={styles.actions}>
              <Pressable
                onPress={onClose}
                disabled={busy}
                style={({ pressed }) => [
                  styles.cancel,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                    opacity: pressed || busy ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={[styles.cancelText, { color: colors.text }]}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSubmit}
                disabled={!reason || busy}
                style={({ pressed }) => [
                  styles.submit,
                  {
                    backgroundColor: colors.danger,
                    opacity: !reason || busy ? 0.5 : pressed ? 0.82 : 1,
                  },
                ]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>Send report</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingBottom: 12,
  },
  headText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
  },
  scroll: {
    flexGrow: 0,
  },
  reason: {
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  label: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    minHeight: 86,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    gap: 9,
    paddingTop: 12,
  },
  cancel: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  submit: {
    flex: 1.3,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
