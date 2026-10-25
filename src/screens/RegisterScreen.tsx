import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { registerAPI } from "../api/auth";
import { getErrorMessage } from "../api/client";
import { AuthShell } from "../components/AuthShell";
import { GradientButton } from "../components/GradientButton";
import { TextField } from "../components/TextField";
import { useToast } from "../context/ToastContext";
import { PRIVACY_URL, TERMS_URL } from "../config";
import { useTheme } from "../theme";
import { openExternalUrl } from "../utils/links";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_PATTERN = /^[a-z0-9._]{3,32}$/;

const passwordProblem = (password: string) => {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password must be 128 characters or fewer.";
  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  return "";
};

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanUsername || !cleanEmail || !password) {
      setError("Fill in every field to create your account.");
      return;
    }

    if (!USERNAME_PATTERN.test(cleanUsername)) {
      setError(
        "Username must be 3 to 32 characters using letters, numbers, dots, or underscores."
      );
      return;
    }

    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await registerAPI({
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        password,
      });

      showToast("Account created. Check your inbox to verify your email.", "success");
      router.replace({
        pathname: "/verify-email",
        params: { email: cleanEmail },
      });
    } catch (registerError) {
      setError(
        getErrorMessage(registerError, "Unable to create your account right now.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="A calmer place for your chats, groups, and Bubbles AI."
      onBack={() => router.back()}
      footer={
        <View style={styles.footer}>
          <View style={styles.switchRow}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Already have an account?
            </Text>
            <Pressable onPress={() => router.replace("/login")}>
              <Text style={[styles.link, { color: colors.primary }]}>
                Sign in
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.legal, { color: colors.textSoft }]}>
            By creating an account, you agree to our{" "}
            <Text
              style={[styles.legalLink, { color: colors.textMuted }]}
              onPress={() => openExternalUrl(TERMS_URL)}
            >
              Terms
            </Text>{" "}
            and{" "}
            <Text
              style={[styles.legalLink, { color: colors.textMuted }]}
              onPress={() => openExternalUrl(PRIVACY_URL)}
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
      }
    >
      <TextField
        label="Name"
        icon="happy-outline"
        value={name}
        onChangeText={(value) => {
          setName(value);
          if (error) setError("");
        }}
        placeholder="Your name"
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="next"
      />

      <TextField
        label="Username"
        icon="at-outline"
        value={username}
        onChangeText={(value) => {
          setUsername(value.toLowerCase());
          if (error) setError("");
        }}
        placeholder="yourname"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username-new"
        returnKeyType="next"
      />

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
        returnKeyType="next"
      />

      <TextField
        label="Password"
        icon="lock-closed-outline"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          if (error) setError("");
        }}
        placeholder="At least 8 characters"
        secure
        autoCapitalize="none"
        autoComplete="new-password"
        returnKeyType="next"
      />

      <TextField
        label="Confirm password"
        icon="shield-checkmark-outline"
        value={confirmPassword}
        onChangeText={(value) => {
          setConfirmPassword(value);
          if (error) setError("");
        }}
        placeholder="Type it again"
        secure
        autoCapitalize="none"
        autoComplete="new-password"
        returnKeyType="done"
        onSubmitEditing={handleRegister}
      />

      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}

      <GradientButton
        label="Create account"
        onPress={handleRegister}
        loading={loading}
        icon="person-add-outline"
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  footer: {
    width: "100%",
    gap: 18,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  footerText: {
    fontSize: 14,
  },
  link: {
    fontSize: 14,
    fontWeight: "700",
  },
  legal: {
    fontSize: 11.5,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  legalLink: {
    textDecorationLine: "underline",
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 2,
  },
});
