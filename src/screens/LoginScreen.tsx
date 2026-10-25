import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { loginAPI } from "../api/auth";
import { getErrorMessage } from "../api/client";
import { AuthShell } from "../components/AuthShell";
import { GradientButton } from "../components/GradientButton";
import { TextField } from "../components/TextField";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { PRIVACY_URL, TERMS_URL } from "../config";
import { useTheme } from "../theme";
import { openExternalUrl } from "../utils/links";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function LoginScreen() {
  const { colors } = useTheme();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier || !password) {
      setError("Enter your email or username and your password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await loginAPI(cleanIdentifier, password);
      const token = response.data?.token;
      const user = response.data?.user;

      if (!token || !user) {
        throw new Error("The server did not return a session.");
      }

      await login(token, user);
    } catch (loginError: any) {
      const data = loginError?.response?.data;

      if (data?.code === "EMAIL_NOT_VERIFIED") {
        showToast("Verify your email before signing in.", "info");
        router.push({
          pathname: "/verify-email",
          params: { email: String(data.email || cleanIdentifier) },
        });
        return;
      }

      setError(getErrorMessage(loginError, "Unable to sign in right now."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to pick up every conversation right where you left it."
      footer={
        <View style={styles.footer}>
          <View style={styles.switchRow}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              New to Bubbles?
            </Text>
            <Pressable onPress={() => router.push("/register")}>
              <Text style={[styles.link, { color: colors.primary }]}>
                Create an account
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.legal, { color: colors.textSoft }]}>
            By continuing, you agree to our{" "}
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
        label="Email or username"
        icon="person-outline"
        value={identifier}
        onChangeText={(value) => {
          setIdentifier(value);
          if (error) setError("");
        }}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        keyboardType={EMAIL_PATTERN.test(identifier) ? "email-address" : "default"}
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
        placeholder="Your password"
        secure
        autoCapitalize="none"
        autoComplete="current-password"
        returnKeyType="done"
        onSubmitEditing={handleLogin}
      />

      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}

      <Pressable
        onPress={() => router.push("/forgot-password")}
        style={styles.forgot}
      >
        <Text style={[styles.link, { color: colors.primary }]}>
          Forgot your password?
        </Text>
      </Pressable>

      <GradientButton
        label="Sign in"
        onPress={handleLogin}
        loading={loading}
        icon="arrow-forward"
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
  forgot: {
    alignSelf: "flex-end",
    paddingVertical: 2,
  },
});
