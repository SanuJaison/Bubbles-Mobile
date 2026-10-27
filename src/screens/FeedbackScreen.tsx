import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { submitFeedbackAPI } from "../api/auth";
import { getErrorMessage } from "../api/client";
import { GradientButton } from "../components/GradientButton";
import { InfoDialog } from "../components/InfoDialog";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../theme";

type Category = "suggestion" | "bug" | "feature" | "other";

const categories: { value: Category; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "suggestion", label: "Suggestion", icon: "bulb-outline" },
  { value: "bug", label: "Bug", icon: "bug-outline" },
  { value: "feature", label: "Feature", icon: "sparkles-outline" },
  { value: "other", label: "Other", icon: "ellipsis-horizontal" },
];

export default function FeedbackScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [category, setCategory] = useState<Category>("suggestion");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const handleSubmit = async () => {
    const cleanMessage = message.trim();

    if (cleanMessage.length < 5) {
      setError("Tell us a little more so we can understand your feedback.");
      return;
    }

    setError("");
    setSending(true);

    try {
      await submitFeedbackAPI({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        category,
        message: cleanMessage,
        page: "android-app",
        source: "android",
      });

      setMessage("");
      setSuccessOpen(true);
    } catch (submitError) {
      const nextError = getErrorMessage(
        submitError,
        "Unable to send your feedback right now."
      );
      setError(nextError);
      showToast(nextError, "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={({ pressed }) => [
                styles.back,
                {
                  backgroundColor: colors.surfaceAlt,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="arrow-back" size={21} color={colors.text} />
            </Pressable>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>
                Send feedback
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Ideas, bugs, and anything else on your mind
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.hero,
              { backgroundColor: colors.primarySoft, borderColor: colors.border },
            ]}
          >
            <View style={[styles.heroIcon, { backgroundColor: colors.surface }]}>
              <Ionicons name="chatbox-ellipses" size={24} color={colors.primary} />
            </View>
            <View style={styles.heroText}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>
                Help shape Bubbles
              </Text>
              <Text style={[styles.heroCopy, { color: colors.textMuted }]}>
                Every note is read by the team. Tell us what feels good and what
                needs work.
              </Text>
            </View>
          </View>

          <View style={styles.form}>
            <TextField
              label="Name (optional)"
              icon="person-outline"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              autoCapitalize="words"
              autoComplete="name"
            />

            <TextField
              label="Email (optional)"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
            />

            <View style={styles.categoryWrap}>
              <Text style={[styles.label, { color: colors.textMuted }]}>
                Category
              </Text>
              <View style={styles.categoryRow}>
                {categories.map((item) => {
                  const active = category === item.value;

                  return (
                    <Pressable
                      key={item.value}
                      onPress={() => setCategory(item.value)}
                      style={({ pressed }) => [
                        styles.category,
                        {
                          backgroundColor: active
                            ? colors.primarySoft
                            : colors.surfaceAlt,
                          borderColor: active ? colors.primary : colors.border,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={15}
                        color={active ? colors.primary : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.categoryText,
                          {
                            color: active ? colors.primary : colors.textMuted,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <TextField
              label="Your feedback"
              icon="create-outline"
              value={message}
              onChangeText={(value) => {
                setMessage(value);
                if (error) setError("");
              }}
              placeholder="What should we know?"
              multiline
              maxLength={2000}
            />

            {error ? (
              <Text style={[styles.error, { color: colors.danger }]}>
                {error}
              </Text>
            ) : null}

            <GradientButton
              label="Send feedback"
              onPress={handleSubmit}
              loading={sending}
              disabled={message.trim().length < 5}
              icon="paper-plane-outline"
            />

            <Text style={[styles.privacy, { color: colors.textSoft }]}>
              Feedback is sent with the source marked as Android. We use it only
              to improve Bubbles.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <InfoDialog
        visible={successOpen}
        title="Thank you"
        message="Your feedback is on its way to the Bubbles team."
        buttonLabel="Back to Bubbles"
        onClose={() => {
          setSuccessOpen(false);
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 34,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 16,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11.5,
  },
  hero: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 15.5,
    fontWeight: "800",
  },
  heroCopy: {
    marginTop: 3,
    fontSize: 11.5,
    lineHeight: 16,
  },
  form: {
    marginTop: 20,
    gap: 15,
  },
  categoryWrap: {
    gap: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 2,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  category: {
    minHeight: 36,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  categoryText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 2,
  },
  privacy: {
    fontSize: 10.5,
    lineHeight: 16,
    textAlign: "center",
    paddingHorizontal: 14,
  },
});
