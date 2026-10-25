import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { resendVerificationAPI, verifyEmailAPI } from "../api/auth";
import { getErrorMessage } from "../api/client";
import { AuthShell } from "../components/AuthShell";
import { GradientButton } from "../components/GradientButton";
import { TextField } from "../components/TextField";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../theme";

const firstParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export default function VerifyEmailScreen() {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ email?: string; token?: string }>();
  const token = firstParam(params.token);
  const routeEmail = firstParam(params.email);
  const [email, setEmail] = useState(routeEmail || "");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(Boolean(token));
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const verifyStarted = useRef(false);

  useEffect(() => {
    if (!token || verifyStarted.current) return;

    verifyStarted.current = true;
    let active = true;

    verifyEmailAPI(token)
      .then(() => {
        if (!active) return;
        setVerified(true);
        showToast("Email verified. You can now sign in.", "success");
      })
      .catch((verifyError) => {
        if (!active) return;
        setError(
          getErrorMessage(
            verifyError,
            "This verification link is invalid or has expired."
          )
        );
      })
      .finally(() => {
        if (active) setVerifying(false);
      });

    return () => {
      active = false;
    };
  }, [token, showToast]);

  const handleResend = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Enter the email address you registered with.");
      return;
    }

    setError("");
    setResending(true);

    try {
      await resendVerificationAPI(cleanEmail);
      showToast("A fresh verification email is on its way.", "success");
    } catch (resendError) {
      setError(
        getErrorMessage(
          resendError,
          "Unable to resend the verification email right now."
        )
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      title={verified ? "Email verified" : "Check your inbox"}
      subtitle={
        verified
          ? "Your account is ready. Sign in to start chatting."
          : "We need to confirm your email before you can sign in."
      }
      onBack={() => router.replace("/login")}
      showBrand={!verified}
    >
      {verified ? (
        <GradientButton
          label="Continue to sign in"
          onPress={() => router.replace("/login")}
          icon="arrow-forward"
        />
      ) : (
        <>
          <Text style={[styles.copy, { color: colors.textMuted }]}>
            Open the verification link we sent
            {email ? ` to ${email}` : ""}, then come back to Bubbles. The link
            expires in 24 hours.
          </Text>

          {!routeEmail ? (
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
            />
          ) : null}

          {error ? (
            <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
          ) : null}

          <GradientButton
            label="Resend verification email"
            onPress={handleResend}
            loading={resending || verifying}
            disabled={!email.trim()}
            icon="mail-outline"
          />

          <GradientButton
            label="I have verified my email"
            onPress={() => router.replace("/login")}
            variant="ghost"
          />
        </>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  copy: {
    fontSize: 14.5,
    lineHeight: 22,
    paddingHorizontal: 2,
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 2,
  },
});
