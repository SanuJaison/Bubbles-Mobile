import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { forgotPasswordAPI } from "../api/auth";
import { getErrorMessage } from "../api/client";
import { AuthShell } from "../components/AuthShell";
import { GradientButton } from "../components/GradientButton";
import { TextField } from "../components/TextField";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../theme";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setError("Enter the email address on your account.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await forgotPasswordAPI(cleanEmail);
      setSent(true);
      showToast("If that email is registered, a reset link is on its way.", "success");
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Unable to send a reset link right now.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your account email and we will send a secure reset link."
      onBack={() => router.back()}
    >
      {sent ? (
        <Text style={[styles.sent, { color: colors.textMuted }]}>
          Check your inbox for the reset link. Open it in your browser to choose
          a new password, then come back and sign in.
        </Text>
      ) : null}

      <TextField
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (error) setError("");
        }}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />

      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}

      <GradientButton
        label={sent ? "Send another link" : "Send reset link"}
        onPress={handleSubmit}
        loading={loading}
        icon="paper-plane-outline"
      />

      <GradientButton
        label="Back to sign in"
        onPress={() => router.replace("/login")}
        variant="ghost"
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  sent: {
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 2,
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 2,
  },
});
